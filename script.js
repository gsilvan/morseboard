document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const buttonContainer = document.getElementById('button-container');
    const speedSlider = document.getElementById('speed-slider');
    const speedValueSpan = document.getElementById('speed-value');
    const frequencySlider = document.getElementById('frequency-slider');
    const frequencyValueSpan = document.getElementById('frequency-value');
    const textInput = document.getElementById('text-input');
    const playTextButton = document.getElementById('play-text-button');
    const darkModeToggle = document.getElementById('dark-mode-toggle'); // ++ Get Toggle

    // --- State Variables ---
    let audioContext;
    let isPlaying = false;
    let currentWpm = parseInt(speedSlider.value, 10);
    let currentFrequency = parseInt(frequencySlider.value, 10);

    // --- Audio Timing Parameters ---
    let dotDuration, dashDuration, symbolGap, letterGap, wordGap;

    // --- Morse Code Definitions ---
    const morseCodeMap = { /* ... (keep existing map) ... */
        'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',   'E': '.',
        'F': '..-.',  'G': '--.',   'H': '....',  'I': '..',    'J': '.---',
        'K': '-.-',   'L': '.-..',  'M': '--',    'N': '-.',    'O': '---',
        'P': '.--.',  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
        'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',  'Y': '-.--',
        'Z': '--..',
        '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
        '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
        '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
        '/': '-..-.',  '(': '-.--.',  ')': '-.--.-', '&': '.-...', ':': '---...',
        ';': '-.-.-.', '=': '-...-',  '+': '.-.-.',  '-': '-....-', '_': '..--.-',
        '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
    };

    // --- Function to Update Timing Based on WPM ---
    function updateTimingParameters(wpm) {
        // ... (keep existing function) ...
        if (wpm <= 0) wpm = 1;
        dotDuration = 60 / (50 * wpm);
        dashDuration = dotDuration * 3;
        symbolGap = dotDuration;
        letterGap = dotDuration * 3;
        wordGap = dotDuration * 7;
        console.log(`WPM: ${wpm}, Dot: ${dotDuration.toFixed(3)}s, Letter Gap: ${letterGap.toFixed(3)}s, Word Gap: ${wordGap.toFixed(3)}s`);
    }

    // --- Function to initialize AudioContext ---
    function initAudioContext() {
        // ... (keep existing function) ...
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (!audioContext) {
                    throw new Error("AudioContext creation failed.");
                }
                console.log("AudioContext initialized.");
                if (!dotDuration) {
                    updateTimingParameters(currentWpm);
                }

            } catch (e) {
                console.error("Web Audio API is not supported or failed to initialize.", e);
                alert("Sorry, the Web Audio API needed for sound playback is not supported or failed in your browser.");
                playTextButton.disabled = true;
                return false;
            }
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log("AudioContext resumed.");
            }).catch(err => {
                console.error("Failed to resume AudioContext:", err);
            });
        }
        return !!audioContext;
    }

    // --- Function to play a single tone ---
    function playTone(startTime, duration) {
        // ... (keep existing function) ...
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(currentFrequency, startTime);
        gainNode.gain.setValueAtTime(0, startTime);

        const attackTime = 0.005;
        const releaseTime = 0.005;
        const sustainLevel = 0.7;

        const rampEndTime = startTime + duration;
        const attackEndTime = Math.min(startTime + attackTime, rampEndTime - releaseTime);
        const sustainStartTime = Math.max(attackEndTime, startTime);
        const releaseStartTime = Math.max(sustainStartTime, rampEndTime - releaseTime);

        gainNode.gain.linearRampToValueAtTime(sustainLevel, attackEndTime);
        if (releaseStartTime > sustainStartTime) {
            gainNode.gain.setValueAtTime(sustainLevel, releaseStartTime);
        }
        gainNode.gain.linearRampToValueAtTime(0, rampEndTime);


        oscillator.start(startTime);
        oscillator.stop(rampEndTime);
    }

    // --- Function to play Morse code for a full text string ---
    async function playMorseForText(text) {
        // ... (keep existing function) ...
        if (!audioContext) {
            console.error("AudioContext not available.");
            isPlaying = false;
            playTextButton.disabled = false;
            return;
        }
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        let scheduleTime = audioContext.currentTime;
        const upperCaseText = text.toUpperCase().trim();

        for (let i = 0; i < upperCaseText.length; i++) {
            const char = upperCaseText[i];
            let morseCode = morseCodeMap[char];

            if (morseCode) {
                for (let j = 0; j < morseCode.length; j++) {
                    const symbol = morseCode[j];
                    if (symbol === '.') {
                        playTone(scheduleTime, dotDuration);
                        scheduleTime += dotDuration;
                    } else if (symbol === '-') {
                        playTone(scheduleTime, dashDuration);
                        scheduleTime += dashDuration;
                    }
                    if (j < morseCode.length - 1) {
                        scheduleTime += symbolGap;
                    }
                }
                if (i < upperCaseText.length - 1) {
                    if (upperCaseText[i + 1] === ' ') {
                        scheduleTime += wordGap;
                    } else if (morseCodeMap[upperCaseText[i + 1]]) { // Check if next is a valid char
                        scheduleTime += letterGap;
                    } else {
                        // Next is unknown, maybe add letter gap or smaller gap?
                        scheduleTime += letterGap; // Defaulting to letter gap
                    }
                }
            } else if (char === ' ') {
                // Space itself doesn't add time here; the gap is added *after* the preceding char.
                // This prevents double gaps if text starts/ends with space or has multiple spaces.
                console.log("Space encountered, gap handled by previous character.");
            } else {
                console.warn(`Skipping unknown character: ${char}`);
                // If previous char was valid, add a letter gap before skipping
                if (i > 0 && morseCodeMap[upperCaseText[i-1]]) {
                    scheduleTime += letterGap; // Add gap after the last valid known char
                }
            }
        }

        const totalDuration = (scheduleTime - audioContext.currentTime) * 1000;
        setTimeout(() => {
            isPlaying = false;
            // Check if the button exists before trying to access properties
            if (playTextButton) {
                playTextButton.disabled = false;
            }
            console.log("Playback finished.");
        }, Math.max(totalDuration, 0) + 100);
    } // End playMorseForText


    // --- Generate Individual Character Buttons ---
    // ... (keep existing code) ...
    const characters = Object.keys(morseCodeMap);
    characters.sort((a, b) => {
        const typeA = a.match(/[A-Z]/) ? 0 : (a.match(/[0-9]/) ? 1 : 2);
        const typeB = b.match(/[A-Z]/) ? 0 : (b.match(/[0-9]/) ? 1 : 2);
        if (typeA !== typeB) return typeA - typeB;
        return a.localeCompare(b);
    });

    characters.forEach(char => {
        const button = document.createElement('button');
        button.textContent = char;
        button.classList.add('morse-button');
        button.dataset.char = char;
        buttonContainer.appendChild(button);
    });


    // --- Dark Mode Logic --- // ++ NEW Section
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            darkModeToggle.checked = false;
        }
    }

    darkModeToggle.addEventListener('change', () => {
        const selectedTheme = darkModeToggle.checked ? 'dark' : 'light';
        applyTheme(selectedTheme);
        try {
            localStorage.setItem('morseTheme', selectedTheme); // Save preference
            console.log(`Theme saved: ${selectedTheme}`);
        } catch (e) {
            console.warn("LocalStorage not available. Theme preference not saved.", e);
        }
    });

    // Check for saved theme preference on load
    let savedTheme;
    try {
        savedTheme = localStorage.getItem('morseTheme');
    } catch (e) {
        console.warn("Could not access LocalStorage.", e);
        savedTheme = null; // Fallback
    }


    // Check system preference if no saved theme
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    // Apply initial theme: Saved > System > Default (Light)
    if (savedTheme) {
        applyTheme(savedTheme);
        console.log(`Applying saved theme: ${savedTheme}`);
    } else if (prefersDarkScheme.matches) {
        applyTheme('dark');
        console.log("Applying system theme preference: dark");
    } else {
        applyTheme('light'); // Default
        console.log("Applying default theme: light");
    }

    // Optional: Listen for system preference changes
    prefersDarkScheme.addEventListener('change', (e) => {
        // Only apply if no theme has been *manually* saved by the user
        let currentSavedTheme;
        try {
            currentSavedTheme = localStorage.getItem('morseTheme');
        } catch(err) {
            currentSavedTheme = null;
        }

        if (!currentSavedTheme) {
            const newSystemTheme = e.matches ? 'dark' : 'light';
            applyTheme(newSystemTheme);
            console.log(`System theme preference changed to: ${newSystemTheme}. Applied.`);
        } else {
            console.log("System theme preference changed, but user preference is saved. Ignoring.");
        }
    });

    // --- Other Event Listeners ---

    // Individual Character Button Clicks
    buttonContainer.addEventListener('click', (event) => {
        // ... (keep existing code, ensure initAudioContext is called) ...
        if (event.target.classList.contains('morse-button')) {
            if (!initAudioContext()) return;
            if (isPlaying) return;

            const char = event.target.dataset.char;
            const morse = morseCodeMap[char];

            if (morse) {
                isPlaying = true;
                console.log(`Playing ${char}: ${morse} at ${currentWpm} WPM, ${currentFrequency} Hz`);
                playMorseForText(char);
            } else {
                console.warn(`Morse code not found for character: ${char}`);
            }
        }
    });

    // Play Text Button Click
    playTextButton.addEventListener('click', () => {
        // ... (keep existing code, ensure initAudioContext is called) ...
        if (!initAudioContext()) return;
        if (isPlaying) {
            console.log("Already playing.");
            return;
        }
        const textToPlay = textInput.value;
        if (!textToPlay.trim()) {
            console.log("Text input is empty.");
            return;
        }
        isPlaying = true;
        playTextButton.disabled = true;
        console.log(`Playing text: "${textToPlay}"`);
        playMorseForText(textToPlay);
    });


    // Speed Slider
    speedSlider.addEventListener('input', (event) => {
        // ... (keep existing code) ...
        currentWpm = parseInt(event.target.value, 10);
        speedValueSpan.textContent = `${currentWpm} WPM`;
        updateTimingParameters(currentWpm);
    });

    // Frequency Slider
    frequencySlider.addEventListener('input', (event) => {
        // ... (keep existing code) ...
        currentFrequency = parseInt(event.target.value, 10);
        frequencyValueSpan.textContent = `${currentFrequency} Hz`;
    });

    // --- Initial Setup ---
    speedValueSpan.textContent = `${currentWpm} WPM`;
    frequencyValueSpan.textContent = `${currentFrequency} Hz`;
    updateTimingParameters(currentWpm); // Calculate initial timing
    // Dark mode initialization happens within the Dark Mode Logic section now

}); // End DOMContentLoaded