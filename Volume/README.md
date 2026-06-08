# Sleepy Dog Volume Meter

A classroom microphone noise meter built with HTML5, CSS3, and modern JavaScript.

## How to use

1. Open `index.html` in a browser.
2. Click or tap the dog scene to start the microphone, then allow microphone access.
3. Use the gear button in the corner to open the settings menu.
4. Adjust warning threshold, alarm threshold, and microphone sensitivity.
5. Leave the window visible in the classroom. The dog stays sleeping, becomes disturbed, or wakes up depending on the classroom volume.

## Notes

- Microphone access works best through HTTPS or `localhost`.
- The dog states are PNG image files in the `assets` folder:
  - `dog-sleeping.png`
  - `dog-disturbed.png`
  - `dog-awake.png`
- The main screen only displays the dog scene, the live meter, and the gear settings button.
- The layout scales to full desktop, half-screen, and square floating-window ratios without page scrolling.
