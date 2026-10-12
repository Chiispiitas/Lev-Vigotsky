import {PitchDetector} from './pitch-detector.js';
const detector=new PitchDetector();
self.onmessage=e=>self.postMessage(detector.detect(e.data.samples,e.data.rate,e.data.endTime));
