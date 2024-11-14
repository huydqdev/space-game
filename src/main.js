export class Example extends Phaser.Scene {
    constructor() {
        super()
        this.leaves = []
        this.currentLeafIndex = 0
        this.micActive = false
        this.targetWord = null
        this.recognition = null // For speech recognition
        this.infoBoxOpen = false // Track whether the infoBox is open
        this.scrollSpeed = 5 // Adjust scroll speed
        this.score = 0 // Initialize score
        this.words = ['Joy', 'Nature', 'Life', 'Harmony', 'Balance', 'Peace', 'Wisdom', 'Strength', 'Growth', 'Unity']
    }

    preload() {
        this.load.image('clouds', 'https://play.rosebud.ai/assets/Big Clouds Blended.png?nvxB')
        this.load.image('beanstalk', 'https://play.rosebud.ai/assets/beanstalk_bg.png?aMkx')
        this.load.image('leaf_left', 'https://play.rosebud.ai/assets/leaf_left.png?cvCX')
        this.load.image('leaf_right', 'https://play.rosebud.ai/assets/leaf_right.png?06Jz')
        this.load.image('inactive_mic', 'https://play.rosebud.ai/assets/inactive_mic.png?nVkQ')
        this.load.image('active_mic', 'https://play.rosebud.ai/assets/active_mic.png?xI9S')
        this.load.image('bird_player', 'https://play.rosebud.ai/assets/A cartoon-style bird GIF with flapping wings.png?Ny5s')
    }

    create() {
        this.checkRecognition()

        // Add background and other visual elements
        const beanstalk = this.add.image(0, 0, 'beanstalk').setOrigin(0)
        beanstalk.setScale(1.2)
        this.cameras.main.setBounds(0, 0, beanstalk.width * 1.2, beanstalk.height * 1.2)
        this.cameras.main.scrollY = beanstalk.height * 1.2 - this.cameras.main.height
        this.clouds = this.add.tileSprite(0, 0, 500, 100, 'clouds').setOrigin(0).setScale(2.5)

        // Define leaves with words
        const leafPositions = [
            { x: 270, y: 900, side: 'left' }, { x: 250, y: 700, side: 'left' },
            { x: 200, y: 600, side: 'left' }, { x: 250, y: 500, side: 'left' },
            { x: 200, y: 300, side: 'left' }, { x: 400, y: 950, side: 'right' },
            { x: 380, y: 750, side: 'right' }, { x: 395, y: 650, side: 'right' },
            { x: 320, y: 550, side: 'right' }, { x: 390, y: 350, side: 'right' }
        ]
        leafPositions.forEach((position, index) => {
            const leafKey = position.side === 'left' ? 'leaf_left' : 'leaf_right'
            const leaf = this.add.image(position.x, position.y, leafKey).setScale(0.1)
            leaf.word = this.words[index % this.words.length]

            // Add animations and interactions
            this.tweens.add({
                targets: leaf,
                alpha: { start: 0.8, to: 1 },
                x: `+=${position.side === 'left' ? -4 : 4}`,
                y: '+=4',
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            })
            leaf.setInteractive()
            leaf.on('pointerover', () => leaf.setTint(0x88ff88))
            leaf.on('pointerout', () => leaf.clearTint())
            this.leaves.push(leaf)
        })

        // Add mic icon
        const { width, height } = this.sys.game.config
        this.micIcon = this.add.image(width / 2, height - 50, 'inactive_mic').setScale(0.1)
        this.micIcon.setScrollFactor(0)
        this.micIcon.setInteractive()
        this.micIcon.on('pointerdown', (pointer, localX, localY, event) => {
            event.stopPropagation() // Prevent mic click from closing the infoBox
            this.toggleMic()
        })

        // Score display in top-left corner
        this.scoreText = this.add.text(40, 10, `Score: ${this.score}`, {
            fontSize: '20px',
            color: '#ffffff',
            align: 'left'
        }).setScrollFactor(0)

        // Show the first word after 2 seconds
        this.time.delayedCall(2000, () => {
            this.showInfoBox(this.leaves[this.currentLeafIndex].word)
        })

        // Close infoBox when clicking outside
        this.input.on('pointerdown', (pointer) => {
            if (this.infoBoxOpen && !this.infoBoxBounds.contains(pointer.x, pointer.y)) {
                this.closeInfoBox()
            }
        })

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (!this.infoBoxOpen) {
                this.cameras.main.scrollY += deltaY > 0 ? this.scrollSpeed : -this.scrollSpeed
                this.cameras.main.scrollY = Phaser.Math.Clamp(
                    this.cameras.main.scrollY,
                    0,
                    beanstalk.height * 1.2 - this.cameras.main.height
                )
            }
        })
    }

    showInfoBox(text) {
        this.infoBoxOpen = true

        if (!this.infoBox) {
            const { width, height } = this.sys.game.config
            this.infoBox = this.add.graphics()
            this.infoBox.fillStyle(0x000000, 0.7)
            this.infoBox.fillRoundedRect(width / 2 - 125, height / 2 - 50, 250, 100, 10)
            this.infoBox.setScrollFactor(0)

            this.infoBoxBounds = new Phaser.Geom.Rectangle(width / 2 - 125, height / 2 - 50, 250, 100)
            this.infoText = this.add.text(width / 2, height / 2, text, {
                fontSize: '18px',
                color: '#ffffff',
                align: 'center'
            }).setOrigin(0.5)
            this.infoText.setScrollFactor(0)
        } else {
            this.infoText.setText(text)
            this.infoBox.setVisible(true)
            this.infoText.setVisible(true)
        }
    }

    closeInfoBox() {
        if (this.infoBox) {
            this.infoBox.setVisible(false)
            this.infoBoxOpen = false
        }
        if (this.infoText) this.infoText.setVisible(false)
    }

    toggleMic() {
        if (this.micActive) {
            this.micIcon.setTexture('inactive_mic')
            this.micActive = false
            if (this.recognition) this.recognition.stop()
        } else {
            this.micIcon.setTexture('active_mic')
            this.micActive = true
            this.showInfoBox(this.leaves[this.currentLeafIndex].word)
            this.startRecognitionForCurrentLeaf()
        }
    }

    startRecognitionForCurrentLeaf() {
        if (this.currentLeafIndex < this.leaves.length) {
            const leaf = this.leaves[this.currentLeafIndex]
            this.targetWord = leaf.word
            this.startRecognition()
        } else {
            this.showInfoBox("All words completed!")
        }
    }

    checkRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition()
            this.recognition.interimResults = false
            this.recognition.continuous = true
            this.recognition.lang = "en-US"
            this.recognition.maxAlternatives = 1
            this.recognition.onresult = this.handleSpeechResult.bind(this)
        } else {
            console.error('Speech Recognition not supported in this browser')
        }
    }

    startRecognition() {
        if (this.recognition) {
            this.recognition.start()
        }
    }

    handleSpeechResult(event) {
        const spokenWord = event.results[0][0].transcript.trim().toLowerCase()
        const targetWordLower = this.targetWord.toLowerCase()
        const resultText = spokenWord === targetWordLower ? 'Correct! Good job!' : 'Try again!'
        console.log('===============: ',spokenWord, targetWordLower)
        this.showInfoBox(resultText)

        if (resultText === 'Correct! Good job!') {
            this.score += 10
            this.scoreText.setText(`Score: ${this.score}`)

            setTimeout(() => {
                this.currentLeafIndex++
                if (this.currentLeafIndex < this.leaves.length) {
                    const nextLeaf = this.leaves[this.currentLeafIndex]
                    const camY = this.cameras.main.scrollY
                    const camHeight = this.cameras.main.height
                    const leafY = nextLeaf.y

                    if (leafY < camY || leafY > camY + camHeight) {
                        this.closeInfoBox()
                        this.cameras.main.pan(0, leafY - camHeight / 2, 1000, 'Sine.easeInOut', true)
                        this.cameras.main.once('camerapancomplete', () => {
                            this.showInfoBox(nextLeaf.word)
                        })
                    } else {
                        this.showInfoBox(nextLeaf.word)
                    }
                } else {
                    this.showInfoBox("All words completed!")
                }
            }, 2000)
        }
    }

    update() {
        this.clouds.tilePositionX -= 0.0967
    }
}

const container = document.getElementById('phaser-container')
const config = {
    type: Phaser.AUTO,
    parent: 'phaser-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    width: 600,
    height: 600,
    pixelArt: true,
    crisp: true,
    scene: Example
}

window.phaserGame = new Phaser.Game(config)
