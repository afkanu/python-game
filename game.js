// Game State
let state = {
    xp: 400,
    level: 1,
    currentWorld: 1,
    currentChallengeId: 'w1c1',
    unlockedWorlds: [1],
    earnedBadges: [],
    completedChallenges: []
};

// Load state from local storage if available
const savedState = localStorage.getItem('pyquest_state');
if (savedState) {
    state = JSON.parse(savedState);
}

// Save state
function saveProgress() {
    localStorage.setItem('pyquest_state', JSON.stringify(state));
}

// Game Data
const WORLDS = [
    { id: 1, name: "The Awakening", icon: "🌌", topic: "Variables & Data" },
    { id: 2, name: "The Scrolls", icon: "📜", topic: "Strings & Input" },
    { id: 3, name: "The Forge", icon: "⚒️", topic: "Functions & Loops" },
];

const CHALLENGES = [
    // World 1
    {
        id: "w1c1",
        world: 1,
        title: "Name the Dragon",
        story: "A wild dragon blocks your path! To tame it, you must bind its true name using the ancient art of Variables.",
        task: "Create a variable called <code>dragon_name</code> and assign it the string value <code>'Pyron'</code>.",
        starterCode: "# Tame the dragon!\n# Create your variable here\n\n",
        tests: [
            { 
                check: "dragon_name == 'Pyron'", 
                errorMsg: "Did you create dragon_name and set it to 'Pyron'?" 
            }
        ],
        xpReward: 50,
        hints: ["Variables are created using the = sign.", "Strings must be wrapped in quotes.", "Try writing: dragon_name = 'Pyron'"]
    },
    {
        id: "w1c2",
        world: 1,
        title: "The Health Potion",
        story: "The dragon scratched you! You need to prepare a health potion. Potions are measured in whole numbers (integers).",
        task: "Create a variable called <code>health</code> and assign it the integer value <code>100</code>. Then <code>print(health)</code>.",
        starterCode: "# Prepare your potion\n\n",
        tests: [
            { check: "health == 100", errorMsg: "health must equal 100" },
            { check: "type(health) == int", errorMsg: "health must be an integer, not a string" }
        ],
        expectedOutputSnippet: "100",
        xpReward: 50,
        hints: ["Numbers don't need quotes.", "Try: health = 100", "Don't forget to print(health)"]
    },
    // World 2
    {
        id: "w2c1",
        world: 2,
        title: "The Magic Scroll",
        story: "You found a blank scroll. To activate it, you must combine two magical words.",
        task: "Create two string variables: <code>word1 = 'abra'</code> and <code>word2 = 'cadabra'</code>. Concatenate them into a variable called <code>spell</code> and <code>print(spell)</code>.",
        starterCode: "# Combine the words\nword1 = 'abra'\nword2 = 'cadabra'\n\n# Create the spell variable\n",
        tests: [
            { check: "spell == 'abracadabra'", errorMsg: "spell must equal 'abracadabra'" }
        ],
        expectedOutputSnippet: "abracadabra",
        xpReward: 75,
        hints: ["Use the + operator to join strings.", "Try: spell = word1 + word2"]
    },
    {
        id: "w3c1",
        world: 3,
        title: "The Iron Anvil",
        story: "In the forge, you must craft a function to combine two numbers into their sum.",
        task: "Define a function <code>def add(a, b):</code> that returns the sum of a and b. Then call <code>print(add(3,4))</code>.",
        starterCode: "# Build the add function\n\n",
        tests: [
            { check: "add(2,3) == 5", errorMsg: "Function add should return a+b" },
            { check: "add(-1,1) == 0", errorMsg: "Function add should work with negatives" }
        ],
        expectedOutputSnippet: "7",
        xpReward: 80,
        hints: ["Define a function using def.", "Return a + b.", "Call the function and print the result."]
    }
];

// Sound System
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playVictorySound() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    const now = audioCtx.currentTime;
    
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        const startTime = now + (i * 0.1);
        osc.start(startTime);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        osc.stop(startTime + 0.3);
    });
}

// Initialize Editor
const editor = CodeMirror.fromTextArea(document.getElementById("code-editor"), {
    mode: "python",
    theme: "dracula",
    lineNumbers: true,
    indentUnit: 4,
    matchBrackets: true,
    autoCloseBrackets: true
});

// UI Elements
const ui = {
    xpText: document.getElementById('current-xp'),
    xpBar: document.getElementById('xp-bar'),
    levelBadge: document.getElementById('level-badge'),
    worldList: document.getElementById('world-list'),
    badgesContainer: document.getElementById('badges-container'),
    challengeWorld: document.getElementById('challenge-world-label'),
    challengeTitle: document.getElementById('challenge-title'),
    challengeStory: document.getElementById('challenge-story'),
    challengeTask: document.getElementById('challenge-task'),
    consoleOut: document.getElementById('console-output'),
    feedbackPanel: document.getElementById('feedback-panel'),
    btnRun: document.getElementById('btn-run'),
    btnHint: document.getElementById('btn-hint'),
    hintText: document.getElementById('hint-text'),
    modal: document.getElementById('victory-modal'),
    btnNext: document.getElementById('btn-next')
};

let currentChallenge = null;
let hintIndex = 0;

// Setup Game
function initGame() {
    renderSidebar();
    loadChallenge(state.currentChallengeId || 'w1c1');
    updateProgressUI();
}

function updateProgressUI() {
    ui.xpText.innerText = state.xp;
    
    // Level calc: 100 XP per level
    const newLevel = Math.floor(state.xp / 100) + 1;
    if (newLevel > state.level) {
        state.level = newLevel;
        // Level up effect
        ui.levelBadge.classList.add('pulse');
        setTimeout(() => ui.levelBadge.classList.remove('pulse'), 2000);
    }
    
    ui.levelBadge.innerText = `Lvl ${state.level}`;
    
    // XP Bar (modulo 100 to show progress to next level)
    const xpProgress = state.xp % 100;
    ui.xpBar.style.width = `${xpProgress}%`;
}

function renderSidebar() {
    ui.worldList.innerHTML = '';
    WORLDS.forEach(world => {
        const li = document.createElement('li');
        li.className = `world-item ${state.unlockedWorlds.includes(world.id) ? '' : 'locked'} ${state.currentWorld === world.id ? 'active' : ''}`;
        li.innerHTML = `<span>${world.icon} ${world.name}</span> <small>${world.topic}</small>`;
        
        if (state.unlockedWorlds.includes(world.id)) {
            li.onclick = () => {
                state.currentWorld = world.id;
                // Find first challenge of this world
                const firstChall = CHALLENGES.find(c => c.world === world.id);
                if (firstChall) loadChallenge(firstChall.id);
                renderSidebar();
            };
        }
        ui.worldList.appendChild(li);
    });

    // Render badges
    ui.badgesContainer.innerHTML = '';
    WORLDS.forEach(world => {
        const badge = document.createElement('div');
        badge.className = `badge ${state.earnedBadges.includes(world.id) ? 'earned' : ''}`;
        badge.innerText = world.icon;
        badge.title = `Master of ${world.name}`;
        ui.badgesContainer.appendChild(badge);
    });
}

function loadChallenge(id) {
    currentChallenge = CHALLENGES.find(c => c.id === id);
    if (!currentChallenge) return;
    
    state.currentChallengeId = id;
    state.currentWorld = currentChallenge.world;
    saveProgress();

    const worldName = WORLDS.find(w => w.id === currentChallenge.world).name;
    ui.challengeWorld.innerText = `World ${currentChallenge.world} — ${worldName}`;
    ui.challengeTitle.innerText = currentChallenge.title;
    ui.challengeStory.innerText = currentChallenge.story;
    ui.challengeTask.innerHTML = currentChallenge.task;
    
    editor.setValue(currentChallenge.starterCode);
    ui.consoleOut.innerText = '';
    ui.feedbackPanel.className = 'hidden';
    
    // Reset hints
    hintIndex = 0;
    ui.hintText.className = 'hidden';
    ui.btnHint.disabled = false;
    ui.btnHint.innerText = "💡 Hint (-10 XP)";
    
    renderSidebar();
}

// Skulpt Execution
ui.btnRun.onclick = async () => {
    ui.consoleOut.innerText = '';
    ui.feedbackPanel.className = 'hidden';
    const code = editor.getValue();
    
    Sk.configure({
        output: function(text) {
            ui.consoleOut.innerText += text;
        },
        read: function(x) {
            if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
                throw "File not found: '" + x + "'";
            return Sk.builtinFiles["files"][x];
        }
    });

    try {
        // Run the user's code
        const module = await Sk.misceval.asyncToPromise(() => 
            Sk.importMainWithBody("<stdin>", false, code, true)
        );
        
        // Validation Phase
        let passed = true;
        let errorMessage = "";

        // Check expected output
        if (currentChallenge.expectedOutputSnippet) {
            if (!ui.consoleOut.innerText.includes(currentChallenge.expectedOutputSnippet)) {
                passed = false;
                errorMessage = `Output should contain: ${currentChallenge.expectedOutputSnippet}`;
            }
        }

        // Check internal state (variables) via Skulpt
        if (passed && currentChallenge.tests) {
            const globals = module.$d; // Dictionary of global variables created by the code
            
            for (const test of currentChallenge.tests) {
                try {
                    // We execute the test condition inside a temporary python context
                    // that has access to the user's globals
                    
                    // Create a python dictionary from globals to pass to eval
                    const evalCode = `
def __check__():
    try:
        return ${test.check}
    except Exception as e:
        return False
__result__ = __check__()
`;                  
                    // Append test execution to user code to evaluate condition
                    const testContext = code + "\n" + evalCode;
                    const testModule = await Sk.misceval.asyncToPromise(() => 
                        Sk.importMainWithBody("<stdin>", false, testContext, true)
                    );
                    
                    const res = testModule.$d.__result__;
                    if (res.v != true && res.v !== 1) {
                        passed = false;
                        errorMessage = test.errorMsg;
                        break;
                    }
                } catch(e) {
                    passed = false;
                    errorMessage = test.errorMsg || "Syntax error in check.";
                    break;
                }
            }
        }

        if (passed) {
            handleVictory();
        } else {
            showFeedback("❌ Quest Failed: " + errorMessage, "error");
        }

    } catch (err) {
        showFeedback("🔥 Arcane Error: " + err.toString(), "error");
    }
};

function showFeedback(msg, type) {
    ui.feedbackPanel.innerText = msg;
    ui.feedbackPanel.className = type;
}

function handleVictory() {
    showFeedback("✅ Quest Complete! Spell executed perfectly.", "success");
    
    if (!state.completedChallenges.includes(currentChallenge.id)) {
        state.completedChallenges.push(currentChallenge.id);
        state.xp += currentChallenge.xpReward;
        updateProgressUI();
        saveProgress();
    }
    
    // Play sound and show Modal with animation
    playVictorySound();
    const modalContent = ui.modal.querySelector('.modal-content');
    modalContent.classList.remove('victory-pop');
    void modalContent.offsetWidth; // Force reflow
    modalContent.classList.add('victory-pop');
    
    ui.modal.classList.remove('hidden');
    document.getElementById('modal-reward').innerText = `+${currentChallenge.xpReward} XP`;
}

ui.btnNext.onclick = () => {
    ui.modal.classList.add('hidden');
    
    // Find next challenge
    const currentIndex = CHALLENGES.findIndex(c => c.id === currentChallenge.id);
    if (currentIndex < CHALLENGES.length - 1) {
        const nextChallenge = CHALLENGES[currentIndex + 1];
        
        // Unlock next world if we crossed boundary
        if (nextChallenge.world > currentChallenge.world && !state.unlockedWorlds.includes(nextChallenge.world)) {
            state.unlockedWorlds.push(nextChallenge.world);
            
            // Give badge for completing previous world
            if (!state.earnedBadges.includes(currentChallenge.world)) {
                state.earnedBadges.push(currentChallenge.world);
            }
        }
        
        loadChallenge(nextChallenge.id);
    } else {
        // Game Complete (for now)
        alert("You have mastered all currently available spells! More worlds coming soon.");
        // Give final badge if earned
        if (!state.earnedBadges.includes(currentChallenge.world)) {
            state.earnedBadges.push(currentChallenge.world);
            renderSidebar();
            saveProgress();
        }
    }
};

// Hint System
ui.btnHint.onclick = () => {
    if (hintIndex < currentChallenge.hints.length) {
        if (state.xp >= 10) {
            state.xp -= 10;
            updateProgressUI();
            saveProgress();
            
            ui.hintText.innerText = currentChallenge.hints[hintIndex];
            ui.hintText.classList.remove('hidden');
            hintIndex++;
            
            if (hintIndex >= currentChallenge.hints.length) {
                ui.btnHint.disabled = true;
                ui.btnHint.innerText = "No more hints";
            }
        } else {
            ui.hintText.innerText = "Not enough XP for a hint!";
            ui.hintText.classList.remove('hidden');
        }
    }
};

// Start Game
initGame();
