declare function require(path: string): any;

import { BrowserDetector } from "./browserDetector";
import { Clappr } from "clappr";
import * as _ from 'lodash';

import { Band } from "./band";
import { Channel } from "./channel"

let TWEEN = require('./assets/Tween.js');
let Clappr = require('clappr/dist/clappr.min.js');
let svgDataDict = require('./assets/textGraphicDict.json');

/* Code */

export default class AppComponent {
  private canvas: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D;
  private audioCtx: AudioContext;
  private analyser: AnalyserNode;
  private bufferLength: number;
  private dataArray: Uint8Array;

  private statLength: number = 128;
  private audioFreqMaxValue = 256;

  private stats: number[][];

  private averrageAmplitudes: number[];
  private amplitudeDeltas: number[];
  private amplitudes: number[];

  private fontStyle: string;
  private fontWeight: number;

  private cityTitle: HTMLElement;
  private currentChannelIndex: number;
  private player: Clappr.Player;

  private aboutWindow: HTMLElement;

  constructor() {
    this.init();
    this.draw();
  }

  init = (): void => {
    this.cityTitle = document.getElementById("city-title");
    this.canvas = document.getElementById("oscilloscope") as HTMLCanvasElement;
    this.canvasCtx = this.canvas.getContext("2d");
    this.aboutWindow = document.getElementById("about-window");

    this.initializeAboutWindow();

    this.player = new Clappr.Player({
      mediacontrol: {
        seekbar: "#222;"
      },
      hideVolumeBar: false,
      disableVideoTagContextMenu: false,
      poster: '//static.skylinewebcams.com/8103996589.jpg',
      autoPlay: true,
      chromeless: true,
      // source: "/prog_index.m3u8",//"https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/master.m3u8",//"https://video3.earthcam.com/fecnetwork/hdtimes10.flv/playlist.m3u8", // "http://video3.earthcam.com/fecnetwork/hdtimes10.flv/playlist.m3u8",//"http://video3.earthcam.com/fecnetwork/4017timessquare.flv/chunklist_w324810747.m3u8",
      parentId: "#live",
      persistConfig: true,
      // watermark:"//cdn2.skylinewebcams.com/skylinewebcams.png",
      position: 'top-right',
      // watermarkLink: "//www.skylinewebcams.com/"
    });

    this.updateSize();
    this.randomizeChannel();

    //init stat
    this.clearStat();

    //init font
    this.fontStyle = 'normal';
    this.fontWeight = 300;

    this.registerEvents();
  }

  initializeAboutWindow = (): void => {
    document.getElementById("show-about-button").innerHTML = require('./assets/ui/interactopus_logo.svg');;
    document.getElementById("about-window-title").innerHTML = require('./assets/ui/about_window_title.svg');
    document.getElementById("close-about-button").innerHTML = require('./assets/ui/close.svg');
    document.getElementById("alex-link").innerHTML = require('./assets/ui/alex.svg');
    document.getElementById("dmitry-link").innerHTML = require('./assets/ui/dmitry.svg');
    document.getElementById("maria-link").innerHTML = require('./assets/ui/maria.svg');
    document.getElementById("vadim-link").innerHTML = require('./assets/ui/vadim.svg');
    document.getElementById("live-icon").innerHTML = require('./assets/ui/live.svg');
    document.getElementById("typetoday-logo").innerHTML = require('./assets/ui/typetoday.svg');
    document.getElementById("randomize-button").innerHTML = require('./assets/ui/randomize.svg');
  }

  clearStat = (): void => {
    this.stats = [];
    for (let i = 0; i < this.bands.length; i++) {
      this.stats[i] = [0];
    }
  }

  registerEvents = () => {
    document.getElementById("randomize-button").onclick = this.randomizeChannel;

    this.player.on(Clappr.Events.PLAYER_PLAY, () => {
      console.log("play");
      //вернем эквалайзер
      this.canvas.style.setProperty("display", "inherit");
    });

    document.getElementById("close-about-button").onclick = () => {
      this.addClass(this.aboutWindow, "hidden");
    };

    document.getElementById("show-about-button").onclick = () => {
      this.removeClass(this.aboutWindow, "hidden");
    };

    window.addEventListener('resize', this.updateSize, true);
    setInterval(this.updateFont, 200);
  }

  updateSize = (): void => {
    const videoWidth = 960;
    const videoHeight = 540;
    const videoRatio = videoWidth / videoHeight;

    let player_width = window.innerWidth;
    let player_height = window.innerHeight;
    let player_ratio = player_width / player_height;

    let actualVideoWidth = player_width;
    let actualVideoHeight = actualVideoWidth / videoRatio;

    this.player.resize({ height: player_height, width: player_width })

    this.canvas.width = 1.8 * window.innerWidth;
    this.canvas.height = actualVideoHeight / 4;

    let bottomPos = Math.round((player_height - actualVideoHeight) / 2);
    this.canvas.style.setProperty("bottom", `${bottomPos}px`);
  }

  initializeAudio = (): void => {
    if (this.analyser)
      this.analyser.disconnect();

    if (this.audioCtx)
      this.audioCtx.close();

    let wind = window as any;
    this.audioCtx = new (wind.AudioContext || wind.webkitAudioContext || wind.mozAudioContext || wind.msAudioContext)();

    var videoElement = document.getElementsByTagName("video")[0];
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.8;

    var source = this.audioCtx.createMediaElementSource(videoElement);
    source.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);

    this.analyser.fftSize = 2048;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    this.analyser.getByteTimeDomainData(this.dataArray);
  }

  channels: Channel[] = [
    new Channel("Cleveland", "https://video3.earthcam.com/fecnetwork/8939.flv/playlist.m3u8"),
    new Channel("Chicago", "https://video3.earthcam.com/fecnetwork/5187.flv/playlist.m3u8"),
    new Channel("Dublin", "https://video3.earthcam.com/fecnetwork/4054.flv/playlist.m3u8"),
    new Channel("New York", "https://video3.earthcam.com/fecnetwork/4017timessquare.flv/playlist.m3u8"),
    new Channel("Austin", "https://video3.earthcam.com/fecnetwork/paradiseon6.flv/playlist.m3u8"),
    new Channel("Doha", "https://video3.earthcam.com/fecnetwork/7947.flv/playlist.m3u8"),
    new Channel("Las Vegas", "https://video3.earthcam.com/fecnetwork/eclasvegas.flv/playlist.m3u8"),
    new Channel("Columbus", "https://video3.earthcam.com/fecnetwork/6427.flv/playlist.m3u8"),
    new Channel("Belmont", "https://video3.earthcam.com/fecnetwork/5324.flv/playlist.m3u8"),
    new Channel("San Francisco", "https://video3.earthcam.com/fecnetwork/6961.flv/playlist.m3u8"),
  ];

  bands: Band[] = [
    new Band(0, 31, 900),
    new Band(32, 63, 800),
    new Band(64, 95, 700),
    new Band(96, 127, 600),
    new Band(128, 159, 500),
    new Band(160, 191, 400),
    new Band(192, 255, 300),
    new Band(256, 511, 200),
    new Band(512, 1023, 100)
  ];

  updateCurrentAmplitudes = (): void => {
    this.amplitudes = [];

    for (let bandIndex = 0; bandIndex < this.bands.length; bandIndex++) {
      let summ = 0;
      let amplitude = 0;
      let band = this.bands[bandIndex];

      //summ
      for (let freqIndex = band.indexFrom; freqIndex <= band.indexTo; freqIndex++) {
        summ += this.dataArray[freqIndex];
      }

      amplitude = summ / band.width();
      this.amplitudes[bandIndex] = amplitude;

      if (isNaN(amplitude)) {
        debugger
        amplitude = 0;
      }
    }
  }

  updateAverrageAndDelta = (): void => {
    this.averrageAmplitudes = [];
    this.amplitudeDeltas = [];

    for (let bandIndex = 0; bandIndex < this.bands.length; bandIndex++) {
      let bandStatAmplitudeArray = this.stats[bandIndex];
      let averageAmplitude = _.mean(bandStatAmplitudeArray);

      let amplitude = this.amplitudes[bandIndex];
      let amplitudeDelta = averageAmplitude - amplitude;

      this.averrageAmplitudes[bandIndex] = averageAmplitude;
      this.amplitudeDeltas[bandIndex] = amplitudeDelta;
    }
  }

  updateStat = (): void => {
    for (let bandIndex = 0; bandIndex < this.bands.length; bandIndex++) {
      let bandStatAmplitudeArray = this.stats[bandIndex];
      let amplitude = this.amplitudes[bandIndex];

      //добавляем только полезные значения
      if (amplitude != 0)
        bandStatAmplitudeArray.push(amplitude);

      //выкидываем устаревший элемент статистики
      if (bandStatAmplitudeArray.length > this.statLength)
        bandStatAmplitudeArray.shift();
    }
  }

  updateFont = (): void => {
    let max = _.max(this.amplitudeDeltas);

    for (let bandIndex = 0; bandIndex < this.bands.length; bandIndex++) {
      let delta = this.amplitudeDeltas[bandIndex];
      let band = this.bands[bandIndex];

      if (delta == max) {
        this.fontWeight = band.fontWeight;
      }
    }

    if (this.amplitudeDeltas[2] < 0)
      this.fontStyle = 'italic';
    else
      this.fontStyle = 'normal';


    let channel = this.channels[this.currentChannelIndex];
    this.updateTextAndStyle(channel);
    // this.cityTitle.style.setProperty("font-weight", this.fontWeight.toString());
    // this.cityTitle.style.setProperty("font-style", this.fontStyle.toString());
  }

  updateTextAndStyle = (channel: Channel) => {
    // debugger;
    let fontStylePrefix = this.fontStyle === undefined ? 'n' : this.fontStyle[0];
    let fontWeightPrefix = this.fontWeight === undefined ? 4 : this.fontWeight / 100;
    let key = `${channel.title}${fontStylePrefix}${fontWeightPrefix}`;
    var svg = svgDataDict[key];
    this.cityTitle.innerHTML = svg;
  }

  setChannel = (channel: Channel): void => {
    //скроем эквалайзер
    this.canvas.style.setProperty("display", "none");

    this.player.stop();
    this.updateTextAndStyle(channel);

    this.player.load(channel.playlist, "application/x-mpegURL", true);
    this.player.play();
    this.clearStat();
    this.initializeAudio();
  }

  updateChannel = (): void => {
    let channel = this.channels[this.currentChannelIndex];
    this.setChannel(channel);
  }

  nextChannel = (): void => {
    this.currentChannelIndex += 1;
    this.currentChannelIndex %= this.channels.length;
    this.updateChannel();
  }

  prevChannel = (): void => {
    this.currentChannelIndex -= 1;
    if (this.currentChannelIndex < 0)
      this.currentChannelIndex = this.channels.length - 1;
    this.updateChannel();
  }

  randomizeChannel = (): void => {
    this.currentChannelIndex = Math.round(Math.random() * (this.channels.length - 1));
    this.updateChannel();
  }

  draw = (): void => {
    requestAnimationFrame(this.draw);

    this.analyser.getByteFrequencyData(this.dataArray);

    this.canvasCtx.fillStyle = 'rgba(255, 255, 255 , 1)';
    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.updateCurrentAmplitudes();
    this.updateAverrageAndDelta();
    this.updateStat();

    this.drawRawGraphic(this.canvasCtx);
    // this.drawAmplitudes(this.amplitudes, this.canvasCtx, 'rgb(255, 0, 0)')
    // this.drawAmplitudes(this.averrageAmplitudes, this.canvasCtx, 'rgb(0, 255, 0)')
  };

  drawRawGraphic = (canvasCtx: CanvasRenderingContext2D): void => {
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    canvasCtx.beginPath();

    let sliceWidth = this.canvas.width * 2.0 / this.bufferLength;
    let canvas = canvasCtx.canvas;

    var x = 0;
    for (var i = 0; i < this.bufferLength; i++) {

      var v = this.dataArray[i] / this.audioFreqMaxValue;
      var y = v * canvas.height;

      canvasCtx.lineTo(x, y);
      x += sliceWidth;
    }

    this.canvasCtx.stroke();
  }

  drawAmplitudes = (dataAmp: number[], canvasCtx: CanvasRenderingContext2D, color: string): void => {
    let canvas = canvasCtx.canvas;
    let sliceWidth = this.canvas.width * 2.0 / this.bufferLength;

    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = color;
    canvasCtx.beginPath();

    for (let bandIndex = 0; bandIndex < this.bands.length; bandIndex++) {
      let band = this.bands[bandIndex];
      let amp = dataAmp[bandIndex];

      let xMin = sliceWidth * band.indexFrom;
      let xMax = sliceWidth * band.indexTo;
      let y = canvas.height * amp / this.audioFreqMaxValue;

      canvasCtx.moveTo(xMin, y);
      canvasCtx.lineTo(xMax, y);
    }
    this.canvasCtx.lineTo(canvas.width, 0);
    this.canvasCtx.stroke();
  }

  oldAdd = (element, className) => {
    let classes = element.className.split(' ')
    if (classes.indexOf(className) < 0) {
      classes.push(className)
    }
    element.className = classes.join(' ')
  }

  oldRemove = (element, className) => {
    let classes = element.className.split(' ')
    const idx = classes.indexOf(className)
    if (idx > -1) {
      classes.splice(idx, 1)
    }
    element.className = classes.join(' ')
  }

  addClass = (element, className) => {
    if (element.classList) {
      element.classList.add(className)
    } else {
      this.oldAdd(element, className)
    }
  }

  removeClass = (element, className) => {
    if (element.classList) {
      element.classList.remove(className)
    } else {
      this.oldRemove(element, className)
    }
  }

  /* app component end */
}

let start = new AppComponent();
