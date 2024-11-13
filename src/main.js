const config = {
    type: Phaser.AUTO,
    parent: "phaser-container",
    backgroundColor: '0x000000',
    width: 512,
    height: 512,
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
            gravity: { y: 0 },
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

let recognition;



// Predefined words to compare with
const predefinedWords = ['buy', 'hello', 'nice'];

// Variables to store UI elements and game states
let promptWord;
let startButton;


// init game 
let bird;
let gates;
let shouldSpawnGate = true;
let birdSpeed = 100;
let currentWordIndex = 0;

new Phaser.Game(config);

function preload() {
    this.load.setPath("assets");
    this.load.image('mic-button', 'stream/mic.png');
    this.load.image('facetime-button', 'stream/facetime.png');
    this.load.image('bird', 'bird-scream/bird.png');
    this.load.image('forest-bg', 'bird-scream/forest_bg.png');
    this.load.image('floor-bg', 'floor.png');
    this.load.image('gate', 'bird-scream/gate.png');
}

function create() {
    checkRecognition();
    video = document.createElement('video');
    video.autoplay = false;
    setupGame.call(this);
}

function setupGame() {
    let background = this.add.image(0, 0, 'forest-bg').setOrigin(0);
    let scaleY = this.cameras.main.height / background.height;
    background.setScale(scaleY).setScrollFactor(0);
    this.background = this.add.tileSprite(0, 0, config.width, config.height, 'floor-bg');
    this.background.setOrigin(0, 0);
    // this.background.setScrollFactor(0);
    //
    bird = this.physics.add.sprite(50, 300, 'bird');
    bird.setDisplaySize(50, 50);
    bird.setCollideWorldBounds(false);
    bird.setVelocityX(birdSpeed);

    // Set up camera to follow bird
    this.cameras.main.startFollow(bird);
    this.cameras.main.setFollowOffset(-200, 0);
    this.cameras.main.setLerp(0.05, 0);

    // Create gates group
    gates = this.physics.add.group();

    // Add collision between bird and gates
    this.physics.add.collider(bird, gates, hitGate, null, this);
}

function setupAudioProcessing(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    // analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
}

function update() {
    // Set up space key for jumping
    this.cursors = this.input.keyboard.createCursorKeys();
    this.cursors.space.on("down", () => {
        square.body.setVelocityY(-200);
    });
    // set up audio user for jumping
    if (analyser && isMicActive) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // if (average > 50 && square.body.touching.down) {  // Adjust this threshold as needed
        if (average > 25) {  // Adjust this threshold as needed
            const jumpVelocity = Math.min(-100, -average * 2);  // Adjust this scaling factor as needed
            square.body.setVelocityY(jumpVelocity);
        }
    }
    
    // set up background game
    // this.cameras.main.setBounds(0, 0, this.bird.x + this.cameras.main.width, this.cameras.main.height);
    // this.background.tilePositionX += 2;
    
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

    // Disconnect or reconnect the microphone source based on the mic state
    if (isMicActive) {
        microphone.connect(analyser);
        startRecognition();
    } else {
        microphone.disconnect(analyser);
    }
}

function updateButtonState(background, isActive) {
    background.setFillStyle(isActive ? 0xcccccc : 0xff0000);
}

function checkRecognition(){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

    let speechRecognitionList = new SpeechGrammarList();
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1; // default value
        console.log('Speech Recognition supported in this browser:');
    } else {
        console.error('Speech Recognition not supported in this browser');
    }
}

function startRecognition(){
    // Get a random word for the player to speak
    promptWord = Phaser.Utils.Array.GetRandom(predefinedWords);
    if (recognition) {
        recognition.start(); // when recognition start
        console.log('======promptWord: ',promptWord)
        recognition.onresult = (event) => {
            const recognizedText = event.results[0][0].transcript.trim().toLowerCase();
            console.log('======results: ', event.results);
            checkAnswer(recognizedText);
        };

        recognition.onerror = (event) => {
            recognition.onspeechend = () => {
                recognition.stop();
            };
        };
    }
}

function checkAnswer(recognizedText) {
    if (recognizedText === promptWord) {
        console.log('Correct! Well done!')
    } else {
        console.log('Incorrect! You said: "${recognizedText}". Try again!')
        startRecognition();
    }
}

function hitGate(bird, gate) {
    // Decrease gate health
    gate.health--;
    if (gate.health <= 0) {
        gate.destroy();
        this.shouldSpawnGate = true;
        // Immediately set the bird's velocity back to its normal speed
        bird.setVelocityX(this.birdSpeed);
    } else {
        // Bounce the bird back
        bird.setVelocityX(-150);
        // Move the bird forward again after a short delay
        this.time.delayedCall(500, () => {
            bird.setVelocityX(this.birdSpeed);
        });
    }
}