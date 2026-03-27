class StudyMusic {
    constructor() {
        this.audio = new Audio();
        this.audio.loop = true;
        
        // Load state from localStorage
        this.currentSound = localStorage.getItem('study-music-type') || 'white';
        this.volume = parseFloat(localStorage.getItem('study-music-volume')) || 0.5;
        this.shouldBePlaying = localStorage.getItem('study-music-playing') === 'true';
        
        this.isPlaying = false;
        this.fadeInterval = null;

        this.initElements();
        this.setupEventListeners();
        this.applyState();
    }

    initElements() {
        this.player = document.getElementById('music-player');
        this.toggleBtn = document.getElementById('music-toggle-btn');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.soundSelect = document.getElementById('sound-select');
        this.volumeSlider = document.getElementById('volume-slider');
    }

    setupEventListeners() {
        // Toggle player expansion
        this.toggleBtn.addEventListener('click', () => {
            this.player.classList.toggle('expanded');
        });

        // Play/Pause button
        this.playPauseBtn.addEventListener('click', () => {
            this.togglePlay();
        });

        // Sound selection change
        this.soundSelect.addEventListener('change', (e) => {
            this.changeSound(e.target.value);
        });

        // Volume slider
        this.volumeSlider.addEventListener('input', (e) => {
            this.setVolume(e.target.value);
        });

        // Close player if clicking outside when expanded
        document.addEventListener('click', (e) => {
            if (this.player.classList.contains('expanded') && 
                !this.player.contains(e.target)) {
                this.player.classList.remove('expanded');
            }
        });

        // Handle audio errors (e.g. file not found)
        this.audio.addEventListener('error', (e) => {
            console.error("Audio error:", e);
            this.pause();
            alert("Could not load audio file. Please ensure /static/audio/ contains the required mp3 files.");
        });
    }

    applyState() {
        this.soundSelect.value = this.currentSound;
        this.volumeSlider.value = this.volume;
        this.audio.volume = this.volume;
        this.updateAudioSource();

        // Note: Autoplay might be blocked by browsers until first user interaction
        if (this.shouldBePlaying) {
            // We'll try to play, but browsers often block this until a click
            const playAttempt = () => {
                this.play();
                document.removeEventListener('click', playAttempt);
            };
            document.addEventListener('click', playAttempt);
        }
    }

    updateAudioSource() {
        const source = `/static/audio/${this.currentSound}.mp3`;
        // Only update if source changed
        if (!this.audio.src.endsWith(source)) {
            this.audio.src = source;
        }
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (this.isPlaying) return;

        this.updateAudioSource();
        
        // Start with volume 0 for fade in
        this.audio.volume = 0;
        
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.playPauseBtn.textContent = '⏸';
            this.player.classList.add('playing');
            localStorage.setItem('study-music-playing', 'true');
            this.fadeIn();
        }).catch(err => {
            console.warn("Playback blocked or failed:", err);
            this.isPlaying = false;
        });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playPauseBtn.textContent = '▶';
        this.player.classList.remove('playing');
        localStorage.setItem('study-music-playing', 'false');
        if (this.fadeInterval) clearInterval(this.fadeInterval);
    }

    fadeIn() {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        
        const targetVolume = this.volume;
        let currentVol = 0;
        const duration = 1000; // 1 second fade in
        const interval = 50;
        const step = targetVolume / (duration / interval);

        this.fadeInterval = setInterval(() => {
            currentVol += step;
            if (currentVol >= targetVolume) {
                this.audio.volume = targetVolume;
                clearInterval(this.fadeInterval);
            } else {
                this.audio.volume = currentVol;
            }
        }, interval);
    }

    changeSound(soundType) {
        const wasPlaying = this.isPlaying;
        this.currentSound = soundType;
        localStorage.setItem('study-music-type', soundType);
        
        if (wasPlaying) {
            this.pause();
            this.updateAudioSource();
            this.play();
        } else {
            this.updateAudioSource();
        }
    }

    setVolume(value) {
        this.volume = parseFloat(value);
        localStorage.setItem('study-music-volume', value);
        if (this.isPlaying) {
            this.audio.volume = this.volume;
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.studyMusic = new StudyMusic();
});
