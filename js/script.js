const PLAYER_PLAY = `Прослушать`;
const PLAYER_STOP = `Остановить`;
const PLAYER_EXECUTE = `Выполнить`;
const END_POINT = `https://dev.apps.jam-track.com` ;

const title = document.querySelector(`.training-title`);
const wrapper = document.querySelector(`.at-wrap`);
const playerControls = document.querySelector(`.controls`);
const main = wrapper.querySelector(`.at-main`);
const viewport = wrapper.querySelector(`.at-viewport`);
const tempoForm = document.querySelector(`.tempo-form`);
const tempoInput = tempoForm.querySelector(`.tempo-input`);
const messageBlock = document.querySelector(`.messages`);
let mediaRecorder;
let isPlayerFinished = false;

const drumAPI = new trackAPI(END_POINT);

const updateCookies = (trackId, trackTempo) => {
  document.cookie = `id = ${trackId};`;
  document.cookie = `tempo = ${trackTempo};`;
}

const getCookie = (name) => {
  let matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
};

const updateInterfaceValues = (trainingName, trainingTempo) => {
  title.textContent = trainingName;
  tempoInput.value = trainingTempo;
}

const changeTempo = (trackId, tempo) => {

  drumAPI.changeTempo(trackId, tempo)
    .then((response) => {
      main.innerHTML = ``;
      updateInterfaceValues(response.tabname, response.tempo);
      renderTrack(response.drumex_file, response.id, response.intro_click, response.kick_times4feedback);
      renderEffects(response.kick_times4feedback);
    });
}

const renderTrack = (trackFileName, trackId, introFileName, data) => {
  messageBlock.textContent = ``;
  updateCookies(trackId, tempoInput.value);
  // initialize alphatab
  const settings = {
    file: `${END_POINT}/${trackFileName}`,
    //file: `https://improvizzz.online/drumex/exmp_5_modified.gp`,
    player: {
      enablePlayer: true,
      soundFont: `https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2`,
      scrollElement: wrapper.querySelector(`.at-viewport`),
      scrollMode: 1,
      scrollSpeed: 240000 / tempoInput.value
    },
  };

  const audio = new Audio(`${END_POINT}/${introFileName}`);

  const alphaTabAPI = new alphaTab.AlphaTabApi(main, settings);
  alphaTabAPI.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;

  const changeTracksVolume = (volume) => {
    alphaTabAPI.score.tracks.forEach((track) => {
      alphaTabAPI.changeTrackVolume(track, volume);
    });
  };

  // initialize mediaDevices
  const initializeMediaDevices = () => {
    return navigator.mediaDevices.getUserMedia({ audio: true})
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      let voice = [];

      mediaRecorder.addEventListener(`dataavailable`, function(event) {
        voice.push(event.data);
      });

      mediaRecorder.addEventListener(`stop`, function() {
        const voiceBlob = new Blob(voice, {type: `audio/mp3`});

        const audioUrl = URL.createObjectURL(voiceBlob);
        var audio = document.createElement('audio');
        audio.src = audioUrl;
        audio.controls = true;
        document.querySelector('.messages').appendChild(audio);
        voice = [];

        if (isPlayerFinished) {
          const file = new File([voiceBlob], `${trackId}_${tempoInput.value}_${Math.round(Math.random() * 10000)}.mp3`, {type: `audio/mp3`});
          drumAPI.sendRecord(file);
        }
      });

      return mediaRecorder;
    });
  };


  // overlay logic
  const overlay = wrapper.querySelector(`.at-overlay`);
  alphaTabAPI.renderStarted.on(() => {
    overlay.style.display = `flex`;
  });
  alphaTabAPI.renderFinished.on(() => {
    overlay.style.display = `none`;
  });

  alphaTabAPI.renderStarted.on(() => {
    // collect tracks being rendered
    const tracks = new Map();
    alphaTabAPI.tracks.forEach((t) => {
      tracks.set(t.index, t);
    });
  });

  const metronome = document.querySelector(`.metronome-btn`);
  if (metronome.classList.contains(`active-btn`)) {
    metronome.classList.remove(`active-btn`);
  }
  metronome.onclick = () => {
    metronome.classList.toggle(`active-btn`);
    if (metronome.classList.contains(`active-btn`)) {
      alphaTabAPI.metronomeVolume = 1;
    } else {
      alphaTabAPI.metronomeVolume = 0;
    }
  };

  // main player controls
  const playPauseBtn = playerControls.querySelector(`.play-btn`);
  const executePauseBtn = playerControls.querySelector(`.execute-btn`);
  const newTrainingBtn = playerControls.querySelector(`.new-training-btn`);

  const changePlayerBtnsState = (btn, btnToDisable) => {
    if (btn.textContent === PLAYER_PLAY || btn.textContent === PLAYER_EXECUTE) {
      btn.textContent = PLAYER_STOP;
      btn.classList.add(`active-btn`);
      btnToDisable.disabled = true;
      newTrainingBtn.disabled = true;
    } else {
      btn.textContent = btn.classList.contains(`play-btn`) ? PLAYER_PLAY : PLAYER_EXECUTE;
      btn.classList.remove(`active-btn`);
      btnToDisable.disabled = false;
      newTrainingBtn.disabled = false;
    }
  };

  const togglePlayer = (evt, btnText, metronomeCounter = 0) => {
    if (evt.target.textContent === btnText) {
      alphaTabAPI.countInVolume = metronomeCounter ? metronomeCounter : 0;
      alphaTabAPI.playPause();
    } else {
      alphaTabAPI.stop();
      viewport.scroll(0,0);
    }
  };

  const recordVoice = (evt, mediaRecorder) => {
    messageBlock.textContent = `READY`;
    let counter = 3;
    changeTracksVolume(0);
    togglePlayer(evt, PLAYER_EXECUTE, counter);

    const timerId = setInterval(() => {
      messageBlock.textContent = counter;
      counter--;
      if (counter === -1) {

        mediaRecorder.start();
        executePauseBtn.disabled = false;
        messageBlock.textContent = `GO`;
        clearInterval(timerId);
        changePlayerBtnsState(executePauseBtn, playPauseBtn);

      }
    }, 60 * 1000 / tempoInput.value);
  };

  playPauseBtn.onclick = (evt) => {
    changeTracksVolume(1);
    togglePlayer(evt, PLAYER_PLAY);
    changePlayerBtnsState(playPauseBtn, executePauseBtn);
  };

  executePauseBtn.onclick = (evt) => {
    if (evt.target.textContent === PLAYER_EXECUTE) {
      executePauseBtn.disabled = true;
      if (mediaRecorder) {
        recordVoice(evt, mediaRecorder);
      } else {
        initializeMediaDevices(executePauseBtn.textContent)
        .then((mediaRecorder) => recordVoice(evt, mediaRecorder))
        .catch((err) => {
          messageBlock.textContent = err.name;
        });
      }
    } else {
      messageBlock.textContent = ``;
      messageBlock.innerHTML = ``;
      mediaRecorder.stop();
      togglePlayer(evt, PLAYER_EXECUTE);
      changePlayerBtnsState(executePauseBtn, playPauseBtn);
    }
  };

  alphaTabAPI.playerFinished.on((evt) => {
    if (executePauseBtn.textContent === PLAYER_STOP) {
      isPlayerFinished = true;
      executePauseBtn.click();
    }
    if (playPauseBtn.textContent === PLAYER_STOP) {
      playPauseBtn.click();
    }
  });

  newTrainingBtn.onclick = (evt) => {
    main.innerHTML = ``;
    messageBlock.innerHTML = ``;
    renderNewTraining();
  };

  tempoForm.onsubmit = (evt) => {
    evt.preventDefault();
    changeTempo(trackId, tempoInput.value);
  };

  // song position
  function formatDuration(milliseconds) {
    let seconds = milliseconds / 1000;
    const minutes = (seconds / 60) | 0;
    seconds = (seconds - minutes * 60) | 0;
    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0")
    );
  }
  var prevTime = -1;
  alphaTabAPI.playerPositionChanged.on((e) => {
    var curTime = rounded(e.currentTime / 1000);
    setTime(curTime, data);
    if (formatDuration(e.currentTime) < prevTime) {
      renderEffects(data);
    }
    prevTime = formatDuration(e.currentTime);
  });
}

const renderNewTraining = () => {
  drumAPI.getRandomTrack()
  .then((response) => {
    updateInterfaceValues(response.tabname, response.tempo);
    renderTrack(response.drumex_file, response.id, response.intro_click, response.kick_times4feedback);
    renderEffects(response.kick_times4feedback);
  });
};
getCookie(`id`) ? changeTempo(getCookie(`id`), getCookie(`tempo`)) : renderNewTraining();




// EFFECTS
var hintContainer = document.querySelector('.hint');
var hintContainerLeft = document.querySelector('.hint__left');
var hintContainerCenter = document.querySelector('.hint__center');
var hintContainerRight = document.querySelector('.hint__right');

const R = 'Right';
const L = 'Left';

function rounded(number) {
  return +number.toFixed(2);
}

Object.filter = (obj, predicate) =>
Object.keys(obj)
    .filter( key => predicate(obj[key]) )
    .reduce( (res, key) => Object.assign(res, { [key]: obj[key] }), {}
);

function sortObj(obj) {
  var effect = obj.effects.flat();
  if (effect.length > 0 || obj.texts !== ' ') {
    return obj;
  }
}

function createAnimation(el, duration_second, startTime) {
  el.classList.add('animated');
  el.style.animationName = 'moveDown';
  el.style.animationDuration = duration_second + 's';
  el.style.animationDelay = startTime - duration_second + 'ms';
  el.style.animationTimingFunction = 'linear';
  el.style.animationPlayState = 'paused';
}

function addEffect(key, el, container, duration_second, startTime) {
  b = document.createElement('p');
  b.innerHTML = el;
  b.classList.add('effect');
  createAnimation(container, duration_second, startTime);
  container.appendChild(b);
}

function renderEffects(data) {
  hintContainerLeft.textContent = ``;
  hintContainerCenter.textContent = ``;
  hintContainerRight.textContent = ``;

  var filteredData = Object.filter(data, sortObj);
  Object.keys(filteredData).forEach(function(key) {
    var effect = filteredData[key].effects.flat();

    text = document.createElement('div');
    text.classList.add(key);

    effect.forEach(element => {
      hintContainerCenter.appendChild(text);
      addEffect(key, element, text, filteredData[key].duration_second, filteredData[key].time);
    });

    var hand = filteredData[key].texts;
    switch(hand) {
       case 'R':
        text = document.createElement('div');
        text.classList.add(key);
        hintContainerRight.appendChild(text);
        addEffect(key, R, text, filteredData[key].duration_second, filteredData[key].time);

        break;
       case 'L':
        text = document.createElement('div');
        text.classList.add(key);
        hintContainerLeft.appendChild(text);
        addEffect(key, L, text, filteredData[key].duration_second, filteredData[key].time);
        break;
    }
 });
};

function setTime(curTime, data) {
  var filteredData = Object.filter(data, sortObj);

  Object.keys(filteredData).forEach(function(key) {
    var startTime = rounded((filteredData[key].time) - (filteredData[key].duration_second));
    var endTime = rounded(filteredData[key].time);

    if (curTime == 0 && endTime == 0) {
      var el = document.getElementsByClassName(key);
      Array.from(el).forEach(element => {
        element.style.display = 'none';
      })
    }

    if (curTime > startTime && curTime < endTime) {
      var el = document.getElementsByClassName(key);
      Array.from(el).forEach(element => {
        element.style.animationPlayState = 'running';
      });
    }
  });
}
