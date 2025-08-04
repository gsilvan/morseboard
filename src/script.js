document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const buttonContainer = document.getElementById('button-container');
    const speedSlider = document.getElementById('speed-slider');
    const speedValueSpan = document.getElementById('speed-value');
    const frequencySlider = document.getElementById('frequency-slider');
    const frequencyValueSpan = document.getElementById('frequency-value');
    const textInput = document.getElementById('text-input');
    const playTextButton = document.getElementById('play-text-button');
    const morseOutput = document.getElementById('morse-output');
    const ditButton = document.getElementById('dit-button');
    const dahButton = document.getElementById('dah-button');

    // --- State Variables ---
    let audioContext;
    let isPlaying = false;
    let currentWpm = parseInt(speedSlider.value, 10);
    let currentFrequency = parseInt(frequencySlider.value, 10);

    // --- Audio Timing Parameters ---
    let dotDuration, dashDuration, symbolGap, letterGap, wordGap;

    // --- Morse Code Definitions ---
    const morseCodeMap = {
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

    /**
     * Translates a string of text into a visual Morse code representation.
     * @param {string} text The text to translate.
     * @returns {string} The Morse code string, with '/' for word gaps.
     */
    function translateToMorse(text) {
        return text
            .toUpperCase()
            .split('')
            .map(char => {
                if (morseCodeMap[char]) {
                    return morseCodeMap[char];
                } else if (char === ' ') {
                    return '/'; // Use a slash to represent a word gap
                }
                return ''; // Ignore unknown characters
            })
            .join(' ') // Separate all characters/words with a single space
            .replace(/\s+/g, ' ') // Condense multiple spaces into one
            .replace(/\s?\/\s?/g, ' / ') // Ensure consistent spacing around slashes
            .trim();
    }

    // --- Function to Update Timing Based on WPM ---
    function updateTimingParameters(wpm) {
        if (wpm <= 0) wpm = 1;
        dotDuration = 60 / (50 * wpm);
        dashDuration = dotDuration * 3;
        symbolGap = dotDuration;
        letterGap = dotDuration * 3;
        wordGap = dotDuration * 7;
    }

    // --- Function to initialize AudioContext ---
    function initAudioContext() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported.", e);
                alert("Sorry, the Web Audio API needed for sound is not supported by your browser.");
                playTextButton.disabled = true;
                return false;
            }
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        return !!audioContext;
    }

    // --- Function to play a single tone ---
    function playTone(startTime, duration) {
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
        gainNode.gain.linearRampToValueAtTime(sustainLevel, startTime + attackTime);
        gainNode.gain.setValueAtTime(sustainLevel, startTime + duration - releaseTime);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    // --- Function to play Morse code for a full text string ---
    async function playMorseForText(text) {
        if (!initAudioContext()) {
            isPlaying = false;
            if(playTextButton) playTextButton.disabled = false;
            return;
        }

        let scheduleTime = audioContext.currentTime;
        const upperCaseText = text.toUpperCase().trim();

        for (let i = 0; i < upperCaseText.length; i++) {
            const char = upperCaseText[i];
            const morseCode = morseCodeMap[char];

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
                    scheduleTime += (upperCaseText[i + 1] === ' ') ? wordGap : letterGap;
                }
            } else if (char === ' ') {
                // Gap is handled after the character, so we don't need to do anything here
            } else {
                scheduleTime += letterGap; // Pause for unknown chars
            }
        }

        const totalDuration = (scheduleTime - audioContext.currentTime) * 1000;
        setTimeout(() => {
            isPlaying = false;
            if (playTextButton) playTextButton.disabled = false;
        }, Math.max(totalDuration, 0) + 100);
    }

    // --- Generate Individual Character Buttons ---
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

    // --- Event Listeners ---
    textInput.addEventListener('input', () => {
        morseOutput.value = translateToMorse(textInput.value);
    });

    buttonContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('morse-button')) {
            if (isPlaying || !initAudioContext()) return;
            const char = event.target.dataset.char;
            isPlaying = true;
            playMorseForText(char);
        }
    });

    playTextButton.addEventListener('click', () => {
        if (isPlaying || !initAudioContext()) return;
        const textToPlay = textInput.value;
        if (!textToPlay.trim()) return;
        isPlaying = true;
        playTextButton.disabled = true;
        playMorseForText(textToPlay);
    });

    speedSlider.addEventListener('input', (event) => {
        currentWpm = parseInt(event.target.value, 10);
        speedValueSpan.textContent = `${currentWpm} WPM`;
        updateTimingParameters(currentWpm);
    });

    frequencySlider.addEventListener('input', (event) => {
        currentFrequency = parseInt(event.target.value, 10);
        frequencyValueSpan.textContent = `${currentFrequency} Hz`;
    });

    ditButton.addEventListener('click', () => {
        if (!initAudioContext()) return;
        playTone(audioContext.currentTime, dotDuration);
    });

    dahButton.addEventListener('click', () => {
        if (!initAudioContext()) return;
        playTone(audioContext.currentTime, dashDuration);
    });

    // --- Initial Setup ---
    speedValueSpan.textContent = `${currentWpm} WPM`;
    frequencyValueSpan.textContent = `${currentFrequency} Hz`;
    updateTimingParameters(currentWpm);
    morseOutput.value = translateToMorse(textInput.value);
});