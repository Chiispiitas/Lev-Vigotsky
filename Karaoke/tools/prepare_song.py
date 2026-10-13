"""Prepare a local instrumental + isolated vocal + line-timed LRC package."""
import argparse, json, re, shutil, hashlib
from pathlib import Path
import numpy as np
import librosa
from scipy.ndimage import median_filter
from song_sync import align_vocal_activity

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
source, out = Path(args.source), Path(args.output)
out.mkdir(parents=True, exist_ok=True)
vocal = next(source.glob('*Vocals.mp3'))
instrumental = next(source.glob('*Instrumental.mp3'))
lrc = next(source.glob('*.lrc'))
print('Loading isolated vocal track...', flush=True)
y, sr = librosa.load(vocal, sr=16000, mono=True)
duration = librosa.get_duration(y=y, sr=sr)
print('Extracting reference pitch with pYIN...', flush=True)
hop=160
f0, voiced, probability = librosa.pyin(y, sr=sr, fmin=75, fmax=1000, frame_length=2048, hop_length=hop, fill_na=None)
times = librosa.times_like(f0, sr=sr, hop_length=hop)
rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
valid=np.isfinite(f0)&(probability>=.08)&(rms>=.004)
midi=librosa.hz_to_midi(f0)
# Bridge only brief consonants / detector dropouts with nearby similar pitches.
observed=valid.copy()
indices=np.flatnonzero(valid)
bridged=0
for left,right in zip(indices[:-1],indices[1:]):
    if 1<right-left<=13 and abs(midi[right]-midi[left])<=2.5:
        midi[left:right+1]=np.linspace(midi[left],midi[right],right-left+1)
        valid[left:right+1]=True
        bridged+=right-left-1
# A centered median filter smooths vibrato jitter without shifting the timeline.
boundaries=np.flatnonzero(np.diff(np.r_[False,valid,False]))
for start,end in zip(boundaries[::2],boundaries[1::2]):
    midi[start:end]=median_filter(midi[start:end],size=5,mode='nearest')
frames = []
for index,(t,pitch,yes,confidence) in enumerate(zip(times,midi,valid,probability)):
    if yes:
        frames.append({'t':round(float(t),3),'midi':round(float(pitch),3),'confidence':round(float(confidence),3),'interpolated':not bool(observed[index])})
notes = []
for frame in frames:
    midi = round(frame['midi'])
    if notes and frame['t'] - notes[-1]['end'] < .015 and abs(frame['midi']-notes[-1]['midi'])<.8:
        notes[-1]['end'] = round(frame['t'] + .01, 3)
    else:
        notes.append({'start':frame['t'], 'end':round(frame['t'] + .01, 3), 'midi':midi})
# Keep genuine short sung notes. The continuous contour also covers transitions.
merged=[]
for note in notes:
    if merged and note['start']-merged[-1]['end']<=.12 and note['midi']==merged[-1]['midi']:
        merged[-1]['end']=note['end']
    else: merged.append(note)
notes=merged
lyrics=[]
for line in lrc.read_text(encoding='utf-8-sig').splitlines():
    match = re.match(r'\[(\d+):(\d+(?:\.\d+)?)\](.*)', line)
    if match:
        t = int(match[1])*60+float(match[2])
        if t >= 9: lyrics.append({'start':t, 'text':match[3].strip()})
for i, line in enumerate(lyrics):
    line['end'] = min(lyrics[i+1]['start'] if i+1<len(lyrics) else duration, line['start']+7)
song={'id':'its-been-so-long','title':"It's Been So Long",'artist':'The Living Tombstone','language':'English','duration':round(duration,3),'instrumental':'assets/instrumental.mp3','lyrics':lyrics,'timing':{'lyricsOffset':.65,'melodyOffset':0},'reference':{'method':'librosa-pyin-smoothed','version':2,'hopSeconds':.01,'reviewed':False,'frames':[f for f in frames if not f['interpolated']],'contour':frames,'notes':notes,'bridgedFrames':int(bridged)},'lyricPrecision':'line'}
song=align_vocal_activity(song,y,sr)
# Reuse the measured video mapping only for the exact source files it was checked against.
alignment=json.loads(Path(__file__).with_name('contest-youtube-alignment.json').read_text())
if (hashlib.sha256(vocal.read_bytes()).hexdigest()==alignment['sourceVocalSha256'] and
    hashlib.sha256(lrc.read_bytes()).hexdigest()==alignment['sourceLrcSha256']):
    offset=alignment['selectedOffsetSeconds']
    song.update(playback='youtube',video=alignment['video'],duration=round(alignment['youtubeDuration'],3))
    song['timing']={'lyricsOffset':round(.65+offset,6),'melodyOffset':offset,'revision':4}
    song['reference']['version']=4
    song['recordingAlignment']={'video':alignment['video'],'source':'https://www.youtube.com/watch?v='+alignment['video'],
        'method':'normalized waveform cross-correlation against isolated source vocal','sampleRate':8000,
        'offsetSeconds':offset,'anchors':5,'maxAnchorSpreadSeconds':0,'checkedOn':alignment['checkedOn']}
else:
    print('Source files differ from the verified YouTube alignment; retaining local playback.',flush=True)
shutil.copy2(instrumental, out/'instrumental.mp3')
shutil.copy2(lrc, out/'lyrics.lrc')
(out/'song.json').write_text(json.dumps(song,separators=(',',':')),encoding='utf-8')
print(json.dumps({'duration':duration,'referenceFrames':len(song['reference']['frames']),'contourFrames':len(frames),'notes':len(notes),'lines':len(lyrics)}), flush=True)
