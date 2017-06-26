/*                                                               *
 * |------------------------------------------------------------ *
 * | Frequency Bin Index :  0 (i)  |    800 (i)  |  1.024 (i)  | *
 * | Frequency Value     : 20 (Hz) | 20.000 (Hz) | 25.600 (Hz) | *
 * |------------------------------------------------------------ *
 */

const analyser = require('web-audio-analyser');
const MAX_DECIBELS = 255;

export default class AudioReactive {

  constructor(audio) {
    this._multipleSources = false;
    this._audioDuration = 0.0;
    this._isPlaying = false;
    this.isReady = false;

    this._longestSource = null;
    this._soundSource = null;
    this._soundSources = {};

    this._startTime = null;
    this._pauseTime = null;

    this._name = 'AudioReactive';
    this._audioSrc = audio;
    this._init();
  }

  _init() {
    let AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext = new AudioContext();
    let audioContextAnalyser = audioContext.createAnalyser();

    this._frequencyRange = audioContextAnalyser.frequencyBinCount;
    this._getMaxAudioPower();
  }

  _getMaxAudioPower() {
    let max = 0;

    for (let i = 0; i < this._frequencyRange; i++) {
      max += MAX_DECIBELS + i;
    }

    console.clear();
    this.MAX_POWER = (max / this._frequencyRange - 1) / 100;
    console.info(`Max audio power = ${this.MAX_POWER * 100}`);
  }

  _loadAudioTrack(onPlay, study = false) {
    let onAudioEnded = study ? this._setAudioValues.bind(this) : this._onAudioTrackEnded.bind(this);

    this._multipleSources = typeof this._audioSrc === 'object';

    if (this._multipleSources) {
      return this._loadAudioTracks(onPlay);
    }

    if (this._soundSource === null) {
      this._soundSource = document.createElement('audio');
    }

    this._soundSource.autoplay = false;
    this._soundSource.src = this._audioSrc;
    this._soundSource.addEventListener('ended', onAudioEnded);

    this._soundSource.addEventListener('canplay', () => {
      this._audioDuration = this._soundSource.duration;
      this._soundSource.loaded = true;
      this._soundSource.volume = 1.0;
      this.isReady = true;

      if (!study) {
        this._playAudioTrack(onPlay);
      } else {
        this._soundSource.analyser = analyser(this._soundSource);
        this._soundSource.play();

        requestAnimationFrame(this._studyAudio.bind(this));
      }
    });
  }

  _loadAudioTracks(onPlay) {
    const tracks = Object.keys(this._audioSrc).length;
    let audioDuration = 0;
    let sourceIndex = 0;

    for (let source in this._audioSrc) {
      this._soundSources[source] = document.createElement('audio');
      this._soundSources[source].src = this._audioSrc[source];
      this._soundSources[source].autoplay = false;

      this._soundSources[source].addEventListener('canplay', () => {
        this._soundSources[source].loaded = true;
        this._soundSources[source].volume = 1.0;
        sourceIndex++;

        if (this._soundSources[source].duration > audioDuration) {
          audioDuration = this._soundSources[source].duration;
          this._longestSource = source;
        }

        if (sourceIndex === tracks) {
          this._soundSources[this._longestSource].addEventListener('ended', this._onAudioTrackEnded.bind(this));

          this._audioDuration = audioDuration;
          this._playAudioTracks(onPlay);
          this.isReady = true;
        }
      });
    }
  }

  _playAudioTrack(onPlay) {
    this._startTime = Date.now();
    this._soundSource.analyser = analyser(this._soundSource);

    this._soundSource.play();
    this._isPlaying = true;

    if (typeof onPlay === 'function') {
      onPlay();
    }
  }

  _playAudioTracks(onPlay) {
    for (let source in this._soundSources) {
      this._soundSources[source].analyser = analyser(this._soundSources[source]);
      this._soundSources[source].play();
    }

    this._startTime = Date.now();
    this._isPlaying = true;

    if (typeof onPlay === 'function') {
      onPlay();
    }
  }

  _onAudioTrackEnded() {

  }

  _studyAudio() {
    let frequency = this._getAverageFrequency();

    if (this._maxFrequency < frequency) {
      this._maxFrequency = frequency;
    }

    if (this._minFrequency > frequency) {
      this._minFrequency = frequency;
    }

    requestAnimationFrame(this._studyAudio.bind(this));
  }

  _getAverageFrequency(source = null) {
    const soundSource = source ? this._soundSources[source] : this._soundSource;
    let freq = soundSource.analyser.frequencies();
    let sum = 0;

    for (let i = 0; i < freq.length; i++) {
      sum += freq[i] + i;
    }

    sum = sum / freq.length - 1;
    return sum;
  }

  _getAnalysedValue(source) {
    return this._getAverageFrequency(source) / this.MAX_POWER;
  }

  _getFrequencyValuesFromSource(source) {
    let analysed = this._soundSources[source].analyser.frequencies();
    let frequencies = [];

    for (let i = 0; i < analysed.length; i++) {
      frequencies.push(analysed[i] / this._frequencyRange);
    }

    return frequencies;
  }

  _setAudioValues() {
    this.setSongFrequencies({
      min: this._minFrequency,
      max: this._maxFrequency
    });

    console.info(`Song min frequency = ${this._minFrequency}`);
    console.info(`Song max frequency = ${this._maxFrequency}`);
    console.info(`Song frequency range = ${this.SONG_RANGE}`);
  }

  setSongFrequencies(frequencies) {
    this.SONG_MIN_POWER = frequencies.min / this.MAX_POWER;
    this.SONG_MAX_POWER = frequencies.max / this.MAX_POWER;
    this.SONG_RANGE = this.SONG_MAX_POWER - this.SONG_MIN_POWER;
  }

  play(onReady) {
    if (this._multipleSources) {
      this._loadAudioTracks(onReady);
    } else {
      this._loadAudioTrack(onReady);
    }
  }

  getAudioValues() {
    if (this._multipleSources) {
      return false;
    }

    this._maxFrequency = 0;
    this._minFrequency = Infinity;
    this._loadAudioTrack(null, true);
  }

  getAverageValue(source = null) {
    if (source) {
      return this._getAnalysedValue(source);
    }

    let value = this._getAnalysedValue();

    value -= this.SONG_MIN_POWER;
    value = value * 100 / this.SONG_RANGE;

    return Math.round(value) / 100;
  }

  getFrequencyValues(source = null) {
    if (source) {
      return this._getFrequencyValuesFromSource(source);
    }

    let analysed = this._soundSource.analyser.frequencies();
    let frequencies = [];
    // let average = 0;

    for (let i = 0; i < analysed.length; i++) {
      frequencies.push(analysed[i] / this._frequencyRange);
      // average += analysed[i] + i;
    }

    // average = (average / analysed.length - 1) / this.MAX_POWER;
    // average -= this.SONG_MIN_POWER;

    // average = average * 100 / this.SONG_RANGE;
    // average = Math.round(average) / 100;

    return frequencies;

    /* return {
      frequencies: frequencies,
      averageValue: average
    }; */
  }

  getAudioProgress() {
    let percent = 0.0;

    if (this._multipleSources) {
      percent = this._soundSources[this._longestSource].currentTime * 100 / this._audioDuration;
    } else {
      percent = this._soundSource.currentTime * 100 / this._audioDuration;
    }

    return +percent.toFixed(2);
  }
}
