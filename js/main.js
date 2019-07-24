import { LitElement, html } from 'https://unpkg.com/@polymer/lit-element@0.6.2/lit-element.js?module'

class ScreenSharing extends LitElement {
    constructor() {
        super()
        this.enableStartCapture = true
        this.enableStopCapture = false
        this.enableDownloadRecording = false
        this.stream = null
        this.videoStream = null
        this.audioStream = null
        this.combinedStream = null
        this.chunks = []
        this.recorder = null
        this.status = 'Inactive'
        this.recording = null
        this.audioRecording = null
        this.videoRecording = null
    }

    static get properties() {
        return {
            status: String,
            enableStartCapture: Boolean,
            enableStopCapture: Boolean,
            enableDownloadRecording: Boolean,
            recording: {
                type: {
                    fromAttribute: input => input
                }
            }
        }
    }

    render() {
        return html`
        <style>
            .video-container {
                display: flex;
                flex-flow: column nowrap;
                background-color: #fff;
                padding: 10px;
            }

            button {
                border: 0;
                height: 50px;
                font-size: 18px;

            }

            button:hover {
                cursor: pointer;
            }
        </style>
        <div class="video-container">
        <video ?controls="${this.recording !== null}" playsinline muted .src="${this.recording}"></video>
            <div>
                <p>Status: ${this.status}</p>
                <button ?disabled="${!this.enableStartCapture}" @click="${e => this._startCapturing(e)}">Start <span class="emoji">🔴</span></button>
                <button ?disabled="${!this.enableStopCapture}" @click="${e => this._stopCapturing(e)}">Stop <span class="emoji">⬛</span></button>
                <button ?disabled="${!this.enableDownloadRecording}" @click="${e => this._downloadRecording(e)}">Download <span class="emoji">📼</span></button>
                <a id="downloadLink" type="video/mp4" style="display: none"></a>
            </div>
        </div>`
    }

    static _startScreenCapture() {
        return navigator.mediaDevices.getDisplayMedia({ video: true })
    }

    static _startAudioCapture() {
        return navigator.mediaDevices.getUserMedia({ audio: true })
    }

    async _startCapturing(e) {
        console.log('Start capturing.')
        this.enableStartCapture = false
        this.enableStopCapture = true
        this.enableDownloadRecording = false
        this.requestUpdate('buttons')

        if (this.videoRecording || this.audioRecording) {
            window.URL.revokeObjectURL(this.videoRecording && this.audioRecording)
        }

        this.chunks = []
        this.recording = null


        await navigator.mediaDevices.getDisplayMedia({ video: true })
            .then(stream => this.videoStream = stream)
            .then(() => navigator.mediaDevices.getUserMedia({ audio: true }))
            .then(stream => this.audioStream = stream)
            .then(() => {
                this.combinedStream = new MediaStream(
                    [...this.videoStream.getTracks(), ...this.audioStream.getTracks()]
                )})

        this.videoStream.addEventListener('inactive', e => {
            this.status = 'Finished recording'
            console.log('Stream inactive - stop recording!')
            this._stopCapturing(e)
        })
        this.audioStream.addEventListener('inactive', e => {
            this.status = 'Finished recording'
            console.log('Stream inactive - stop recording!')
            this._stopCapturing(e)
        })
        this.combinedStream.addEventListener('inactive', e => {
            this.status = 'Finished recording'
            console.log('Stream inactive - stop recording!')
            this._stopCapturing(e)
        })

        this.recorder = new MediaRecorder(this.combinedStream)
      
        this.recorder.addEventListener('dataavailable', e => {
            if (e.data && e.data.size > 0) {
                this.chunks.push(e.data)
            }
        })

        this.recorder.start(10)
        this.status = 'Recording...'

    }

    _stopCapturing(e) {
        console.log('Stop capturing.')
        this.status = 'Finished recording'
        this.enableStartCapture = true
        this.enableStopCapture = false
        this.enableDownloadRecording = true

        this.recorder.stop()
        this.recorder = null
        this.videoStream.getTracks().forEach(track => track.stop())
        this.audioStream.getTracks().forEach(track => track.stop())
        this.combinedStream.getTracks().forEach(track => track.stop())
        this.videoStream = null
        this.audioStream = null
        this.combinedStream = null

        this.recording = window.URL.createObjectURL(new Blob(this.chunks, { type: 'video/mp4' }))
    }

    _downloadRecording(e) {
        console.log('Download recording.')
        this.enableStartCapture = true
        this.enableStopCapture = false
        this.enableDownloadRecording = false

        const downloadLink = this.shadowRoot.querySelector('a#downloadLink')
        downloadLink.addEventListener('progress', e => console.log(e))
        downloadLink.href = this.recording
        downloadLink.download = 'screen-recording.mp4'
        downloadLink.click()
    }
}

customElements.define('screen-sharing', ScreenSharing)