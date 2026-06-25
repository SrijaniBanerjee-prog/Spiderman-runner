// Global variables to keep compatibility with index.html if needed
var gameState = "story";
var score = 0;
var bestScore = 0;

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Load all static images with exact filenames from original sketch.js
        this.load.image('ground', 'ground-1.png');
        this.load.image('coin', 'coin sprite.png');
        this.load.image('gameOver', 'game over.png');
        this.load.image('reset', 'restart.png');
        this.load.image('controlButton', 'controls button.png');
        this.load.image('playButton', 'play button.png');
        this.load.image('cloud', 'cloud.png');
        this.load.image('rock', 'rock.png');
        this.load.image('backGround', 'HotAirBallon-01.png');
        this.load.image('backGroundNight', 'the background.png');

        // Helper to load animations (loops run to avoid manual line typing)
        for (let i = 1; i <= 11; i++) {
            this.load.image(`spider_man_run_${i}`, `spider man running_${i}.png`);
        }
        for (let i = 6; i <= 7; i++) {
            this.load.image(`spider_man_jump_${i}`, `spider man jumping_${i}.png`);
        }
        for (let i = 1; i <= 5; i++) {
            this.load.image(`carnage_walk_${i}`, `carnage walk_${i}.png`);
        }
        for (let i = 1; i <= 4; i++) {
            this.load.image(`carnage_spin_${i}`, `carnage spin_${i}.png`);
        }
        for (let i = 1; i <= 3; i++) {
            this.load.image(`carnage_slash_${i}`, `carnage slash_${i}.png`);
        }
        for (let i = 1; i <= 10; i++) {
            this.load.image(`venom_run_${i}`, `venom running ${i}.png`);
            this.load.image(`venom_claw_${i}`, `venom claw ${i}.png`);
        }
        for (let i = 1; i <= 8; i++) {
            this.load.image(`lizard_run_${i}`, `lizard running ${i}.png`);
        }
        for (let i = 1; i <= 4; i++) {
            this.load.image(`lizard_kick_${i}`, `lizard kick ${i}.png`);
        }
        for (let i = 1; i <= 10; i++) {
            this.load.image(`electro_walk_${i}`, `electro walking_${i}.png`);
        }
    }

    create() {
        // Create animations
        this.createAnims();

        // Canvas dimensions (fixed layout matching 1000x600 for absolute placement)
        this.canvasWidth = 1000;
        this.canvasHeight = 600;

        // Load correct background image depending on local time
        let hour = new Date().getHours();
        let bgKey = (hour >= 6 && hour <= 18) ? 'backGround' : 'backGroundNight';
        if (!this.textures.exists(bgKey)) bgKey = 'backGround'; // fallback if night is missing

        // Background scrolling TileSprite
        this.bg = this.add.tileSprite(500, 300, 1000, 600, bgKey);

        // Ground scrolling TileSprite (placed at bottom)
        this.ground = this.add.tileSprite(500, 565, 1000, 70, 'ground');
        this.ground.setScale(1.2); // scaled up slightly to cover base

        // Invisible static ground body for physical collisions
        this.invisibleGround = this.physics.add.staticGroup();
        this.groundPlatform = this.add.rectangle(500, 545, 1000, 10);
        this.invisibleGround.add(this.groundPlatform);
        this.groundPlatform.setVisible(false);

        // Spider-Man physics sprite
        this.spiderMan = this.physics.add.sprite(200, 480, 'spider_man_run_1');
        this.spiderMan.setScale(2.0);
        this.spiderMan.setCollideWorldBounds(true);
        this.spiderMan.setBodySize(45, 55, true); // fine-tuned collider size
        this.spiderMan.setGravityY(1200);

        // Colliders
        this.physics.add.collider(this.spiderMan, this.invisibleGround);

        // Groups for obstacles/collectibles
        this.rockGroup = this.physics.add.group();
        this.cloudGroup = this.physics.add.group();
        this.coinGroup = this.physics.add.group();
        this.villainGroup = this.physics.add.group();

        // Collision logic
        this.physics.add.overlap(this.spiderMan, this.rockGroup, this.hitObstacle, null, this);
        this.physics.add.overlap(this.spiderMan, this.villainGroup, this.hitObstacle, null, this);
        this.physics.add.overlap(this.spiderMan, this.coinGroup, this.collectCoin, null, this);

        // Keyboard controls
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.bKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

        // Load high score from local storage
        let savedBest = localStorage.getItem('spider_best_score');
        if (savedBest) bestScore = parseInt(savedBest, 10);

        // Create HUD and all overlays
        this.createHUD();
        this.createStoryScreen();
        this.createControlScreen();
        this.createGameOverScreen();
        this.createMobileControls();

        // Setup timer intervals for spawning
        this.setupSpawnTimers();

        // Set initial game state
        this.changeState("story");

        // Resize handler support
        this.scale.on('resize', this.handleResize, this);
    }

    update() {
        if (gameState === "story") {
            // Static menu background
        }
        else if (gameState === "control") {
            // Go back to menu on B key
            if (Phaser.Input.Keyboard.JustDown(this.bKey)) {
                this.changeState("story");
            }
        }
        else if (gameState === "play") {
            // Speed scaling with score (difficulty progression)
            let speedFactor = 1 + (score * 0.05);
            let bgScrollSpeed = 6 * speedFactor;
            
            // Scroll background and ground TileSprites
            this.bg.tilePositionX += bgScrollSpeed * 0.5;
            this.ground.tilePositionX += bgScrollSpeed;

            // Handle jumping input (Space key)
            if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                this.jump();
            }

            // Update animations based on physics state
            if (this.spiderMan.body.touching.down) {
                if (this.spiderMan.anims.currentAnim?.key !== 'hero_run') {
                    this.spiderMan.play('hero_run');
                }
            } else {
                if (this.spiderMan.anims.currentAnim?.key !== 'hero_jump') {
                    this.spiderMan.play('hero_jump');
                }
            }

            // Adjust timer speeds dynamically based on difficulty
            this.updateSpawnRates(speedFactor);
        }
        else if (gameState === "end") {
            // Pause scrolling and movement
            this.spiderMan.play('hero_run', false);
            this.spiderMan.anims.stop();
        }
    }

    createAnims() {
        // Spider-Man running
        let runFrames = [];
        for (let i = 1; i <= 11; i++) {
            if (this.textures.exists(`spider_man_run_${i}`)) {
                runFrames.push({ key: `spider_man_run_${i}` });
            }
        }
        if (runFrames.length > 0) {
            this.anims.create({
                key: 'hero_run',
                frames: runFrames,
                frameRate: 15,
                repeat: -1
            });
        }

        // Spider-Man jumping
        let jumpFrames = [];
        for (let i = 6; i <= 7; i++) {
            if (this.textures.exists(`spider_man_jump_${i}`)) {
                jumpFrames.push({ key: `spider_man_jump_${i}` });
            }
        }
        if (jumpFrames.length > 0) {
            this.anims.create({
                key: 'hero_jump',
                frames: jumpFrames,
                frameRate: 8,
                repeat: -1
            });
        }

        // Carnage walking animation
        let carnageFrames = [];
        for (let i = 1; i <= 5; i++) {
            if (this.textures.exists(`carnage_walk_${i}`)) carnageFrames.push({ key: `carnage_walk_${i}` });
        }
        if (carnageFrames.length > 0) {
            this.anims.create({
                key: 'carnage_anim',
                frames: carnageFrames,
                frameRate: 12,
                repeat: -1
            });
        }

        // Venom running animation
        let venomFrames = [];
        for (let i = 1; i <= 10; i++) {
            if (this.textures.exists(`venom_run_${i}`)) venomFrames.push({ key: `venom_run_${i}` });
        }
        if (venomFrames.length > 0) {
            this.anims.create({
                key: 'venom_anim',
                frames: venomFrames,
                frameRate: 12,
                repeat: -1
            });
        }

        // Lizard running animation
        let lizardFrames = [];
        for (let i = 1; i <= 8; i++) {
            if (this.textures.exists(`lizard_run_${i}`)) lizardFrames.push({ key: `lizard_run_${i}` });
        }
        if (lizardFrames.length > 0) {
            this.anims.create({
                key: 'lizard_anim',
                frames: lizardFrames,
                frameRate: 12,
                repeat: -1
            });
        }

        // Electro walking animation
        let electroFrames = [];
        for (let i = 1; i <= 10; i++) {
            if (this.textures.exists(`electro_walk_${i}`)) electroFrames.push({ key: `electro_walk_${i}` });
        }
        if (electroFrames.length > 0) {
            this.anims.create({
                key: 'electro_anim',
                frames: electroFrames,
                frameRate: 12,
                repeat: -1
            });
        }
    }

    createHUD() {
        this.hudContainer = this.add.container(0, 0).setDepth(20);
        this.scoreText = this.add.text(30, 30, 'SCORE: 0', {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            fill: '#ffffff',
            stroke: '#1c2646',
            strokeThickness: 6
        });
        this.bestScoreText = this.add.text(30, 70, 'BEST: ' + bestScore, {
            fontFamily: 'Arial Black',
            fontSize: '20px',
            fill: '#ffc107',
            stroke: '#1c2646',
            strokeThickness: 4
        });
        this.hudContainer.add([this.scoreText, this.bestScoreText]);
    }

    createStoryScreen() {
        this.storyContainer = this.add.container(0, 0).setDepth(30);

        // Giant Title logo text
        let titleText = this.add.text(500, 200, 'SPIDER-MAN\nRUNNER', {
            fontFamily: 'Arial Black',
            fontSize: '65px',
            fill: '#f02828',
            align: 'center',
            stroke: '#ffeb3b',
            strokeThickness: 10
        }).setOrigin(0.5);

        // Buttons
        this.playBtn = this.createButton(500, 380, 'PLAY GAME', 'playButton', () => this.changeState("play"));
        this.controlBtn = this.createButton(500, 470, 'CONTROLS', 'controlButton', () => this.changeState("control"));

        this.storyContainer.add([titleText, this.playBtn, this.controlBtn]);
    }

    createControlScreen() {
        this.controlContainer = this.add.container(0, 0).setDepth(30).setVisible(false);

        // Dark-blue styled board
        let bgOverlay = this.add.graphics();
        bgOverlay.fillStyle(0x0c122b, 0.95);
        bgOverlay.fillRoundedRect(50, 40, 900, 520, 16);
        bgOverlay.lineStyle(4, 0x1e88e5, 1);
        bgOverlay.strokeRoundedRect(50, 40, 900, 520, 16);

        let titleText = this.add.text(500, 90, 'SPIDER-MAN RUNNER GAME', {
            fontFamily: 'Arial Black',
            fontSize: '38px',
            fill: '#1e88e5'
        }).setOrigin(0.5);

        let objectiveHeader = this.add.text(100, 160, 'OBJECTIVE:', { fontFamily: 'Arial', fontSize: '24px', fontWeight: 'bold', fill: '#ffeb3b' });
        let objectiveBody1 = this.add.text(100, 195, 'Help Spider-Man escape from the city villains!', { fontFamily: 'Arial', fontSize: '19px', fill: '#ffffff' });
        let objectiveBody2 = this.add.text(100, 225, 'Jump over obstacles and collect coins to increase your score.', { fontFamily: 'Arial', fontSize: '19px', fill: '#ffffff' });

        let controlsHeader = this.add.text(100, 280, 'CONTROLS:', { fontFamily: 'Arial', fontSize: '24px', fontWeight: 'bold', fill: '#ffeb3b' });
        let controlsBody = this.add.text(100, 315, 'SPACE BAR / TAP SCREEN - Jump to avoid hazards', { fontFamily: 'Arial', fontSize: '19px', fill: '#ffffff' });

        let enemiesHeader = this.add.text(100, 370, 'VILLAINS & THREATS:', { fontFamily: 'Arial', fontSize: '24px', fontWeight: 'bold', fill: '#ffeb3b' });
        let enemiesBody = this.add.text(100, 405, '• Electro, Lizard, Carnage, and Venom will bounce towards you!\n• Rocks lie on the ground blocking your path.', { fontFamily: 'Arial', fontSize: '18px', fill: '#e0e0e0', lineSpacing: 6 });

        // Back button
        this.backBtn = this.createButton(500, 510, 'GO BACK', 'reset', () => this.changeState("story"));
        this.backBtn.setScale(0.8);

        this.controlContainer.add([bgOverlay, titleText, objectiveHeader, objectiveBody1, objectiveBody2, controlsHeader, controlsBody, enemiesHeader, enemiesBody, this.backBtn]);
    }

    createGameOverScreen() {
        this.gameOverContainer = this.add.container(0, 0).setDepth(30).setVisible(false);

        // Logo
        if (this.textures.exists('gameOver')) {
            this.gameOverLogo = this.add.image(500, 220, 'gameOver').setScale(0.8);
        } else {
            this.gameOverLogo = this.add.text(500, 220, 'GAME OVER', {
                fontFamily: 'Arial Black',
                fontSize: '70px',
                fill: '#d32f2f',
                stroke: '#ffffff',
                strokeThickness: 8
            }).setOrigin(0.5);
        }

        // Final score display
        this.finalScoreText = this.add.text(500, 340, 'SCORE: 0', {
            fontFamily: 'Arial Black',
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Restart button
        this.restartBtn = this.createButton(500, 440, 'PLAY AGAIN', 'reset', () => this.resetGame());

        this.gameOverContainer.add([this.gameOverLogo, this.finalScoreText, this.restartBtn]);
    }

    createMobileControls() {
        this.mobileControlsContainer = this.add.container(0, 0).setDepth(25).setVisible(false);

        // Pause/Resume button top right
        this.pauseBtn = this.add.graphics();
        this.pauseBtn.fillStyle(0x1a237e, 0.8);
        this.pauseBtn.fillCircle(950, 40, 25);
        this.pauseBtn.lineStyle(2, 0xffffff, 1);
        this.pauseBtn.strokeCircle(950, 40, 25);

        this.pauseText = this.add.text(950, 40, '||', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Interactive zone for pause button
        this.pauseHitZone = this.add.circle(950, 40, 25).setInteractive({ useHandCursor: true });
        this.pauseHitZone.on('pointerdown', (pointer, localX, localY, event) => {
            event.stopPropagation();
            this.togglePause();
        });

        // Bottom right Jump button for tactile mobile input
        this.mobileJumpBtn = this.add.container(850, 480);
        let btnBg = this.add.graphics();
        btnBg.fillStyle(0xd92626, 0.7);
        btnBg.fillCircle(0, 0, 50);
        btnBg.lineStyle(3, 0xffffff, 0.9);
        btnBg.strokeCircle(0, 0, 50);

        let btnLabel = this.add.text(0, 0, 'JUMP', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.mobileJumpBtn.add([btnBg, btnLabel]);
        this.mobileJumpBtn.setSize(100, 100);
        this.mobileJumpBtn.setInteractive({ useHandCursor: true });
        this.mobileJumpBtn.on('pointerdown', (pointer, localX, localY, event) => {
            event.stopPropagation();
            this.jump();
        });

        // Floating jump instructions overlay
        this.tapToJumpMsg = this.add.text(500, 100, 'TAP SCREEN TO JUMP', {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            fill: '#ffffff',
            stroke: '#d92626',
            strokeThickness: 4
        }).setOrigin(0.5).setAlpha(0.7);

        // Add fading animation to tap instruction
        this.tweens.add({
            targets: this.tapToJumpMsg,
            alpha: 0.2,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        this.mobileControlsContainer.add([this.pauseHitZone, this.pauseText, this.mobileJumpBtn, this.tapToJumpMsg]);
    }

    createButton(x, y, label, textureKey, callback) {
        let container = this.add.container(x, y);
        let buttonObj;

        // If customized image asset exists, use it
        if (this.textures.exists(textureKey)) {
            buttonObj = this.add.image(0, 0, textureKey).setScale(0.3);
            buttonObj.setInteractive({ useHandCursor: true });
            buttonObj.on('pointerdown', callback);
            container.add(buttonObj);
        } else {
            // Premium fallback vector button
            let graphics = this.add.graphics();
            graphics.fillStyle(0xd92626, 1);
            graphics.fillRoundedRect(-110, -25, 220, 50, 10);
            graphics.lineStyle(3, 0xffeb3b, 1);
            graphics.strokeRoundedRect(-110, -25, 220, 50, 10);

            let text = this.add.text(0, 0, label, {
                fontFamily: 'Arial Black',
                fontSize: '20px',
                fill: '#ffffff'
            }).setOrigin(0.5);

            container.add([graphics, text]);
            container.setSize(220, 50);
            container.setInteractive({ useHandCursor: true });
            container.on('pointerdown', callback);
        }

        // Add subtle hover effect (scaling)
        container.on('pointerover', () => {
            container.setScale(1.05);
        });
        container.on('pointerout', () => {
            container.setScale(1);
        });

        return container;
    }

    isClickingButtons(pointer) {
        // Prevent jumping when pressing pause button or virtual jump button
        let distToPause = Phaser.Math.Distance.Between(pointer.x, pointer.y, 950, 40);
        let distToJumpBtn = Phaser.Math.Distance.Between(pointer.x, pointer.y, 850, 480);
        return (distToPause <= 40 || distToJumpBtn <= 60);
    }

    changeState(state) {
        gameState = state;

        // Reset visibility
        this.storyContainer.setVisible(false);
        this.controlContainer.setVisible(false);
        this.gameOverContainer.setVisible(false);
        this.mobileControlsContainer.setVisible(false);
        this.hudContainer.setVisible(false);

        // Reset physics
        this.physics.resume();
        this.spiderMan.setVelocity(0, 0);

        if (state === "story") {
            this.storyContainer.setVisible(true);
            this.spiderMan.setVisible(false);
            this.spiderMan.body.enable = false;
            this.stopTimers();
        } 
        else if (state === "control") {
            this.controlContainer.setVisible(true);
            this.spiderMan.setVisible(false);
            this.spiderMan.body.enable = false;
        } 
        else if (state === "play") {
            this.spiderMan.setVisible(true);
            this.spiderMan.body.enable = true;
            this.spiderMan.setX(200);
            this.spiderMan.setY(480);
            this.hudContainer.setVisible(true);
            this.mobileControlsContainer.setVisible(true);

            // Clear existing sprites
            this.rockGroup.clear(true, true);
            this.cloudGroup.clear(true, true);
            this.coinGroup.clear(true, true);
            this.villainGroup.clear(true, true);

            // Start animations
            if (this.spiderMan.anims.exists('hero_run')) {
                this.spiderMan.play('hero_run');
            }

            // Start timers
            this.startTimers();
        } 
        else if (state === "end") {
            this.finalScoreText.setText("SCORE: " + score);
            this.gameOverContainer.setVisible(true);
            this.hudContainer.setVisible(true);
            this.stopTimers();

            // Stop all moving sprites
            this.rockGroup.setVelocityX(0);
            this.cloudGroup.setVelocityX(0);
            this.coinGroup.setVelocityX(0);
            this.villainGroup.setVelocityX(0);
            this.villainGroup.setVelocityY(0);

            // Update high score
            if (score > bestScore) {
                bestScore = score;
                this.bestScoreText.setText("BEST: " + bestScore);
                localStorage.setItem('spider_best_score', bestScore.toString());
            }
        }
    }

    jump() {
        if (gameState !== "play") return;
        
        // Only allow jumping when touching down on the platform
        if (this.spiderMan.body.touching.down) {
            this.spiderMan.setVelocityY(-650);
            this.playJumpSound();
        }
    }

    collectCoin(player, coin) {
        coin.destroy();
        score += 1;
        this.scoreText.setText('SCORE: ' + score);
        this.playCoinSound();
    }

    hitObstacle(player, obstacle) {
        if (gameState !== "play") return;
        this.playHitSound();
        this.changeState("end");
    }

    resetGame() {
        score = 0;
        this.scoreText.setText('SCORE: 0');
        this.changeState("play");
    }

    togglePause() {
        if (this.physics.world.isPaused) {
            this.physics.resume();
            this.pauseText.setText('||');
            // Resume spawn timers
            this.rockTimer.paused = false;
            this.cloudTimer.paused = false;
            this.coinTimer.paused = false;
            this.villainTimer.paused = false;
        } else {
            this.physics.pause();
            this.pauseText.setText('▶');
            // Pause spawn timers
            this.rockTimer.paused = true;
            this.cloudTimer.paused = true;
            this.coinTimer.paused = true;
            this.villainTimer.paused = true;
        }
    }

    setupSpawnTimers() {
        // Timers structure corresponding to frame intervals
        this.rockTimer = this.time.addEvent({
            delay: 2150, // approx 130 frames at 60fps
            callback: this.spawnRock,
            callbackScope: this,
            loop: true,
            paused: true
        });

        this.cloudTimer = this.time.addEvent({
            delay: 2650, // approx 160 frames
            callback: this.spawnCloud,
            callbackScope: this,
            loop: true,
            paused: true
        });

        this.coinTimer = this.time.addEvent({
            delay: 4500, // approx 270 frames
            callback: this.spawnCoin,
            callbackScope: this,
            loop: true,
            paused: true
        });

        this.villainTimer = this.time.addEvent({
            delay: 6600, // approx 400 frames
            callback: this.spawnVillain,
            callbackScope: this,
            loop: true,
            paused: true
        });
    }

    startTimers() {
        this.rockTimer.paused = false;
        this.cloudTimer.paused = false;
        this.coinTimer.paused = false;
        this.villainTimer.paused = false;
    }

    stopTimers() {
        this.rockTimer.paused = true;
        this.cloudTimer.paused = true;
        this.coinTimer.paused = true;
        this.villainTimer.paused = true;
    }

    updateSpawnRates(speedFactor) {
        // Decrease delay based on current score (timings speed up!)
        this.rockTimer.delay = Math.max(900, 2150 - score * 80);
        this.cloudTimer.delay = Math.max(1200, 2650 - score * 50);
        this.coinTimer.delay = Math.max(1800, 4500 - score * 120);
        this.villainTimer.delay = Math.max(2200, 6600 - score * 220);
    }

    spawnRock() {
        if (gameState !== "play") return;
        let speedFactor = 1 + (score * 0.05);
        let rockSpeed = -(420 * speedFactor); // moves left

        let rockSprite = this.physics.add.sprite(1100, 520, 'rock');
        rockSprite.setCollideWorldBounds(false);
        rockSprite.body.setAllowGravity(false);
        rockSprite.setVelocityX(rockSpeed);
        this.rockGroup.add(rockSprite);
    }

    spawnCloud() {
        if (gameState !== "play") return;
        let cloudY = Phaser.Math.Between(40, 250);
        let cloudSprite = this.physics.add.sprite(1100, cloudY, 'cloud');
        cloudSprite.body.setAllowGravity(false);
        cloudSprite.setVelocityX(-360); // cloud speed
        this.cloudGroup.add(cloudSprite);
    }

    spawnCoin() {
        if (gameState !== "play") return;
        let coinY = Phaser.Math.Between(260, 480);
        let coinSprite = this.physics.add.sprite(1100, coinY, 'coin');
        coinSprite.setScale(0.2);
        coinSprite.body.setAllowGravity(false);
        coinSprite.setVelocityX(-360);
        this.coinGroup.add(coinSprite);
    }

    spawnVillain() {
        if (gameState !== "play") return;
        
        let speedFactor = 1 + (score * 0.05);
        let villainSpeedX = -(840 * speedFactor); // moving left
        let villainSpeedY = Phaser.Math.Between(150, 280) * (Math.random() < 0.5 ? -1 : 1);

        // Decide which villain to spawn depending on difficulty progression (Score)
        let choices = [1]; // Electro is always unlocked
        if (score >= 4) choices.push(3); // Lizard unlocks at score 4
        if (score >= 8) choices.push(2); // Carnage unlocks at score 8
        if (score >= 14) choices.push(5); // Venom unlocks at score 14

        let randChoice = Phaser.Utils.Array.GetRandom(choices);
        let villain;

        if (randChoice === 1) { // Electro
            villain = this.physics.add.sprite(1100, 100, 'electro_walk_1');
            villain.setScale(1.5);
            if (this.anims.exists('electro_anim')) villain.play('electro_anim');
        } 
        else if (randChoice === 3) { // Lizard
            villain = this.physics.add.sprite(1100, 100, 'lizard_run_1');
            if (this.anims.exists('lizard_anim')) villain.play('lizard_anim');
        } 
        else if (randChoice === 2) { // Carnage
            villain = this.physics.add.sprite(1100, 100, 'carnage_walk_1');
            if (this.anims.exists('carnage_anim')) villain.play('carnage_anim');
        } 
        else { // Venom
            villain = this.physics.add.sprite(1100, 100, 'venom_run_1');
            villain.setScale(1.7);
            if (this.anims.exists('venom_anim')) villain.play('venom_anim');
        }

        villain.body.setAllowGravity(false);
        villain.setVelocity(villainSpeedX, villainSpeedY);
        villain.setCollideWorldBounds(false);
        
        // Bounce off bounds vertically to make them bounce like in original p5
        villain.body.setBounce(0, 1);
        this.time.addEvent({
            delay: 1500,
            callback: () => {
                if (villain.active) villain.setVelocityY(-villain.body.velocity.y);
            },
            loop: true
        });

        this.villainGroup.add(villain);
    }

    playJumpSound() {
        this.playOscillatorSound(400, 0.15, 'sine');
    }

    playCoinSound() {
        this.playOscillatorSound(800, 0.1, 'sine');
    }

    playHitSound() {
        this.playOscillatorSound(180, 0.35, 'triangle');
    }

    playOscillatorSound(freq, duration, type) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            console.warn("Sound blocked or not supported on this browser:", e);
        }
    }

    handleResize(gameSize) {
        // scale mode Scale.FIT handles primary scaling
    }
}

// Global initialization logic matching config
const config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 600,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [GameScene]
};

// Start the Phaser game
let phaserGame = new Phaser.Game(config);
