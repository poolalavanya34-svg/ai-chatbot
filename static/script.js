const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
const loading = document.getElementById('loading');
const clearBtn = document.getElementById('clear-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const exportBtn = document.getElementById('export-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const historyList = document.getElementById('history-list');
const pills = document.querySelectorAll('.pill');
const micBtn = document.getElementById('mic-btn');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const filePreviewContainer = document.getElementById('file-preview-container');
const fileNameDisplay = document.getElementById('file-name-display');
const removeFileBtn = document.getElementById('remove-file-btn');
const personaSelect = document.getElementById('persona-select');

let currentAbortController = null;
let selectedFile = null;

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendMessage(text, sender, fileUrl = null) {
    if (sender === 'user') {
        const container = document.createElement('div');
        container.classList.add('user-message-container');

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'user-message');
        messageDiv.textContent = text;

        if (fileUrl) {
            const ext = fileUrl.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                const img = document.createElement('img');
                img.src = fileUrl;
                img.classList.add('chat-media');
                messageDiv.appendChild(img);
            } else if (['mp4', 'webm', 'ogg'].includes(ext)) {
                const vid = document.createElement('video');
                vid.src = fileUrl;
                vid.controls = true;
                vid.classList.add('chat-media');
                messageDiv.appendChild(vid);
            } else if (['mp3', 'wav', 'm4a'].includes(ext)) {
                const aud = document.createElement('audio');
                aud.src = fileUrl;
                aud.controls = true;
                aud.classList.add('chat-media');
                messageDiv.appendChild(aud);
            } else {
                const fileLink = document.createElement('a');
                fileLink.href = fileUrl;
                fileLink.textContent = `📎 Download Attachment`;
                fileLink.target = '_blank';
                fileLink.style.display = 'block';
                fileLink.style.color = '#ffffff';
                fileLink.style.marginTop = '6px';
                messageDiv.appendChild(fileLink);
            }
        }

        container.appendChild(messageDiv);

        const editBtn = document.createElement('button');
        editBtn.classList.add('edit-btn');
        editBtn.textContent = '✏️ Edit';
        editBtn.addEventListener('click', () => {
            userInput.value = text.replace(/\[Attached File:.*?\]/, '').trim();
            userInput.style.height = 'auto';
            userInput.style.height = (userInput.scrollHeight) + 'px';
            userInput.focus();
        });
        container.appendChild(editBtn);

        chatMessages.appendChild(container);
    } else {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot-message');
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
    }
    scrollToBottom();
}

function updateHistory(historyArray) {
    historyList.innerHTML = '';
    if (!historyArray || historyArray.length === 0) {
        historyList.innerHTML = '<li class="empty-history">No history yet</li>';
        return;
    }
    historyArray.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        historyList.appendChild(li);
    });
}

async function sendMessage(textToSend) {
    const text = textToSend || userInput.value.trim();
    if (!text && !selectedFile) return;

    appendMessage(text || `Uploaded: ${selectedFile.name}`, 'user', selectedFile ? URL.createObjectURL(selectedFile) : null);
    
    const formData = new FormData();
    formData.append("message", text);
    formData.append("system_prompt", personaSelect ? personaSelect.value : "");
    if (selectedFile) {
        formData.append("file", selectedFile);
    }

    userInput.value = '';
    userInput.style.height = 'auto';
    selectedFile = null;
    filePreviewContainer.classList.add('hidden');
    fileInput.value = '';

    loading.classList.remove('hidden');
    scrollToBottom();

    currentAbortController = new AbortController();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            body: formData,
            signal: currentAbortController.signal
        });

        const data = await response.json();
        loading.classList.add('hidden');

        if (response.ok) {
            appendMessage(data.response, 'bot');
            updateHistory(data.history);
        } else {
            appendMessage(data.error || 'Something went wrong.', 'bot');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            appendMessage('Response stopped by user.', 'bot');
        } else {
            appendMessage('Error: Could not connect to the backend server.', 'bot');
        }
        loading.classList.add('hidden');
    }
}

function exportChat() {
    const messageElements = chatMessages.querySelectorAll('.message, .user-message-container');
    if (messageElements.length <= 1) {
        alert('No conversation to export yet!');
        return;
    }

    let textContent = "=== Local AI Chatbot Transcript ===\n\n";
    messageElements.forEach(el => {
        if (el.classList.contains('user-message-container')) {
            const msgText = el.querySelector('.user-message').textContent.replace('✏️ Edit', '').trim();
            textContent += `User: ${msgText}\n\n`;
        } else if (el.classList.contains('bot-message')) {
            textContent += `AI: ${el.textContent}\n\n`;
        }
    });

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

exportBtn.addEventListener('click', exportChat);

attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        fileNameDisplay.textContent = `📎 ${selectedFile.name}`;
        filePreviewContainer.classList.remove('hidden');
    }
});

removeFileBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    filePreviewContainer.classList.add('hidden');
});

sendBtn.addEventListener('click', () => sendMessage());

userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

stopBtn.addEventListener('click', () => {
    if (currentAbortController) {
        currentAbortController.abort();
        loading.classList.add('hidden');
    }
});

pills.forEach(pill => {
    pill.addEventListener('click', () => {
        const promptText = pill.getAttribute('data-prompt');
        sendMessage(promptText);
    });
});

async function clearChat() {
    try {
        await fetch('/clear', { method: 'POST' });
        location.reload();
    } catch (error) {
        console.error('Failed to clear chat');
    }
}

clearBtn.addEventListener('click', clearChat);
newChatBtn.addEventListener('click', clearChat);

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeToggleBtn) themeToggleBtn.textContent = '☀️ Light';
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.textContent = '☀️ Light';
        } else {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.textContent = '🌙 Dark';
        }
    });
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition && micBtn) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    micBtn.addEventListener('click', () => {
        if (micBtn.classList.contains('recording')) {
            recognition.stop();
            return;
        }
        recognition.start();
    });

    recognition.onstart = () => {
        micBtn.classList.add('recording');
        micBtn.textContent = '⏹️';
    };

    recognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        userInput.value += (userInput.value ? ' ' : '') + speechToText;
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
        userInput.focus();
    };

    recognition.onerror = () => {
        micBtn.classList.remove('recording');
        micBtn.textContent = '🎙️';
    };

    recognition.onend = () => {
        micBtn.classList.remove('recording');
        micBtn.textContent = '🎙️';
    };
} else if (micBtn) {
    micBtn.style.display = 'none';
}