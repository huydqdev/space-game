const config = {
    type: Phaser.AUTO,
    parent: "phaser-container",
    backgroundColor: '0xffffff',
    width: 800,
    height: 600,
    max: {
        width: 1000,
        height: 600,
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let video;
let videoTexture;
let videoImage;
let stream;
let cameraButton;
let micButton;
let cameraBackground;
let micBackground;
let isCameraActive = true;
let isMicActive = true;
let square;

let audioContext;
let analyser;
let microphone;
let dataArray;

new Phaser.Game(config);

function preload() {
    this.load.image('mic-button', 'public/assets/stream/mic.png');
    this.load.image('facetime-button', 'public/assets/stream/facetime.png');
}

function create() {
    video = document.createElement('video');
    video.autoplay = true;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((mediaStream) => {
            stream = mediaStream;
            video.srcObject = stream;

            video.addEventListener('loadedmetadata', () => {
                console.log('Video metadata loaded!');
                videoTexture = this.textures.createCanvas('videoTextureE', 800, 540);
                videoImage = this.add.image(400, 270, 'videoTextureE');

                const context = videoTexture.getContext();

                this.time.addEvent({
                    delay: 30,
                    loop: true,
                    callback: () => {
                        if (video.readyState === video.HAVE_ENOUGH_DATA) {
                            context.drawImage(video, 0, 0, 800, 540);
                            videoTexture.refresh();
                        }
                    }
                });

                // Create buttons with backgrounds
                const buttonY = 570;  // New Y position for buttons (10px below video)
                cameraBackground = this.add.circle(300, buttonY, 30, 0xffffff);
                micBackground = this.add.circle(500, buttonY, 30, 0xffffff);
                cameraButton = this.add.image(300, buttonY, 'facetime-button').setInteractive();
                micButton = this.add.image(500, buttonY, 'mic-button').setInteractive();

                cameraButton.setScale(0.07);
                micButton.setScale(0.07);

                cameraButton.on('pointerdown', toggleCamera);
                micButton.on('pointerdown', toggleMic);

                // Set initial states
                updateButtonState(cameraBackground, isCameraActive);
                updateButtonState(micBackground, isMicActive);

                // Create the red square
                square = this.add.rectangle(400, 270, 15, 15, 0xff0000);
                this.physics.add.existing(square);
                square.body.setCollideWorldBounds(true);

                setupAudioProcessing(mediaStream);
            });
        })
        .catch((error) => {
            console.error('Error accessing camera:', error);
        });
}

function setupAudioProcessing(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
}

function update() {
    // Set up space key for jumping
    this.cursors = this.input.keyboard.createCursorKeys();
    this.cursors.space.on("down", () => {
        square.body.setVelocityY(-200);
    });
    if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        if (average > 50 && square.body.touching.down) {  // Adjust this threshold as needed
            const jumpVelocity = Math.min(-200, -average * 5);  // Adjust this scaling factor as needed
            square.body.setVelocityY(jumpVelocity);
        }
    }
}

function toggleCamera() {
    isCameraActive = !isCameraActive;
    stream.getVideoTracks()[0].enabled = isCameraActive;
    updateButtonState(cameraBackground, isCameraActive);
}

function toggleMic() {
    isMicActive = !isMicActive;
    stream.getAudioTracks()[0].enabled = isMicActive;
    updateButtonState(micBackground, isMicActive);
}

function updateButtonState(background, isActive) {
    background.setFillStyle(isActive ? 0xcccccc : 0xff0000);  
}