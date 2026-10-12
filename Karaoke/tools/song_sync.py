"""Trim prepared cues and pitch targets against sustained vocal activity."""
import numpy as np

def align_vocal_activity(song, samples, sr):
    step=round(sr*.02)
    energy=np.array([np.sqrt(np.mean(samples[i:i+step]**2)) for i in range(0,len(samples),step)])
    active=energy>=.018
    # Retain brief consonants inside phrases, but leave genuine pauses empty.
    edges=np.flatnonzero(np.diff(np.r_[True,active,True]))
    for start,end in zip(edges[::2],edges[1::2]):
        if start>0 and end<len(active) and end-start<=12:active[start:end]=True
    edges=np.flatnonzero(np.diff(np.r_[False,active,False]))
    for start,end in zip(edges[::2],edges[1::2]):
        if end-start<6:active[start:end]=False
    def is_active(t):
        i=round(t*sr/step)
        return 0<=i<len(active) and bool(active[i])
    ref=song['reference']
    ref['frames']=[f for f in ref['frames'] if is_active(f['t'])]
    ref['contour']=[f for f in ref.get('contour',ref['frames']) if is_active(f['t'])]
    notes=[]
    for frame in ref['contour']:
        pitch=round(frame['midi'])
        if notes and frame['t']-notes[-1]['end']<=.015 and abs(frame['midi']-notes[-1]['midi'])<.8:
            notes[-1]['end']=round(frame['t']+.01,3)
        else:notes.append({'start':frame['t'],'end':round(frame['t']+.01,3),'midi':pitch})
    ref['notes']=notes
    offset=song.get('timing',{}).get('lyricsOffset',0)
    for line in song['lyrics']:
        start=line['start']+offset
        end=line['end']+offset
        lo=max(0,int(start*sr/step));hi=min(len(active),int(end*sr/step))
        voiced=np.flatnonzero(active[lo:hi])
        if len(voiced):
            vocal_end=(lo+voiced[-1]+1)*step/sr
            line['end']=round(max(line['start']+.1,min(line['end'],vocal_end-offset)),3)
    song['timing']['revision']=3
    ref['version']=3
    ref['activityAligned']=True
    return song
