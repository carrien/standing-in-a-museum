import React, { useEffect, useReducer, useRef, useCallback, useState, Ref, RefObject } from "react";
import { ActionTypes, Gallery } from "./ActionTypes";
import "./App.css"

const audioContext: AudioContext = new ((window as any).AudioContext ||
  (window as any).webkitAudioContext)();

type Modal = "Welcome" | "Map" | "Passage";

const GalleryNames: [string, Gallery][] = [
  ["Objects Study Room", Gallery.study],
  ["Paige Court", Gallery.court],
  ["Japanese Niche", Gallery.niche],
  ["Bridge", Gallery.bridge],
]

const defaultGalleryParam = window.location.hash.slice(1);

const defaultGallery: Gallery = Object.keys(Gallery).includes(defaultGalleryParam) ?
  (Gallery as any)[defaultGalleryParam] : Gallery.niche;

type AppState = {
  iteration: number;
  gallery: Gallery;
  modal?: Modal;
  offset: number;
};

const defaultAppState: AppState = {
  iteration: 0,
  gallery: defaultGallery,
  offset: 0,
  modal: "Welcome"
};

const appStateReducer = (state: AppState, action: ActionTypes): AppState => {
  if (action.type !== "playbackStatus")
    console.log(action)
  switch (action.type) {
    case "requestGallery":
      return { ...state, gallery: action.gallery };
    case "requestIteration":
      return { ...state, iteration: action.iteration || 0 };
    case "rollOverToIteration":
      return { ...state, iteration: action.iteration || 0 };
    case "playbackStatus":
      return { ...state, offset: action.offset };
    case "dismissModal":
      return { ...state, modal: undefined };
    default:
      return state;
  }
};

const PARALLEL_DOWNLOADS = 3
const PROGRESS_INTERVAL_MS = 50

const dialTo = (duration: number, target: number, audio: HTMLAudioElement) => {
  if (target == 0) {
    audio.pause()
    log("Audio pause")
  } else {
    audio.play()
    log("Audio play")
  }
  //log(`Ramping ${duration}, ${target} ${gainNode}`)
  //kgainNode.gain.setTargetAtTime(target, audioContext.currentTime, duration / 1000 / 3);
  //gainNode.gain.value = target;
}


const BorderProgress: React.FC<{ fractionComplete: number }> = ({ fractionComplete }) => (
  <>
    <div key="0" style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: fractionComplete < .25 ? `${(fractionComplete - 0) * 4 * 100}%` : "100%",
      borderTop: "1vmin solid black"
    }}></div>
    <div key="1" style={{
      position: "absolute",
      right: 0,
      top: 0,
      height: fractionComplete < .5 ? `${(fractionComplete - .25) * 4 * 100}%` : "100%",
      borderRight: "1vmin solid black"
    }}></div>
    <div key="2" style={{
      position: "absolute",
      bottom: 0,
      right: 0,
      width: fractionComplete < .75 ? `${(fractionComplete - .50) * 4 * 100}%` : "100%",
      borderBottom: "1vmin solid black"
    }}></div>
    <div key="3" style={{
      position: "absolute",
      left: 0,
      bottom: 0,
      height: fractionComplete < 1.0 ? `${(fractionComplete - .75) * 4 * 100}%` : "100%",
      borderLeft: "1vmin solid black"
    }}></div>
  </>
)

const useGainedNode = () => {

  const [gain, setGain] = useState<GainNode | null>(null);
  const [node, setNode] = useState<HTMLAudioElement>();
  const ref = useCallback((audioNode: HTMLAudioElement) => {
    //log(`GAining audio node ${audioNode}`);
    //const source = audioContext.createMediaElementSource(audioNode);
    //const gain = audioContext.createGain();
    //source.connect(gain);
    //gain.connect(audioContext.destination);
    //log(`connected audio node ${gain}`);
    //log(`with gain value  ${gain.gain.value}`);
    //setGain(gain)
    setNode(audioNode)
  }, [])
  return [ref, gain, node] as const
}

const getAudioElement = (ref: any) => {
  return ref[2] as (HTMLAudioElement | null)
}

const log = (s: string) => {
  const l = document.getElementById("log")
  l!.innerText = l!.innerText + "\n" + s;
}

window.onerror = function (message, file, line, col, error) {
  log("Error occurred: " + (error as any).message);
  return false;
};

window.addEventListener("error", function (e) {
  log("Error occurred: " + e.error.message);
  return false;
})

log("LOG")

console.log("ACState", audioContext.state)

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appStateReducer, defaultAppState);

  const audioElements: Record<Gallery, readonly [Ref<HTMLAudioElement>, GainNode | null, HTMLAudioElement | undefined]> = {
    [Gallery.study]: useGainedNode(),
    [Gallery.court]: useGainedNode(),
    [Gallery.niche]: useGainedNode(),
    [Gallery.bridge]: useGainedNode()
  };

  useEffect(() => {
    log(`redo effect noAe ${audioElements[state.gallery][2]}`)
    if (audioElements[state.gallery][2]) {
      log(`t = ${audioElements[state.gallery][2]!.src}`)
    }

    let destroy = setInterval(() => {
      const currentAudio = getAudioElement(audioElements[state.gallery])
      if (currentAudio) {

        const offset = currentAudio.currentTime
        dispatch({
          type: "playbackStatus",
          offset
        })

        const previousIteration = state.iteration
        const currentIteration = Math.floor(offset / ITERATION_DURATION)
        if (previousIteration !== currentIteration) {
          console.log("Rollover iteration")
          dispatch({
            type: "rollOverToIteration",
            iteration: currentIteration
          })
        }

      }
      else {
        console.log("Waiting for curfnet audio.")
      }
    }, PROGRESS_INTERVAL_MS)

    return () => clearInterval(destroy)
  }, [state.gallery, state.iteration, audioElements[state.gallery][2]])

  const ITERATION_DURATION = 64.32 // 76;
  const LOOKBACK_ON_SWITCH = 0;
  const VOLUME_RAMP_TIME = 500;

  const fractionComplete = (state.offset % ITERATION_DURATION) / ITERATION_DURATION
  const iterationList: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  // iteration_duration = 64.32s
  return (
    <div className="App">
      {state.modal && <div className="modal">
        <div className="modal-content">
          <button
            className="button start-button"
            onClick={() => {
              log(`AC status: ${audioContext.state}`)
              const currentAudio = getAudioElement(audioElements[state.gallery])
              if (currentAudio) {
                     GalleryNames.forEach(([desc, g]) => {
                      dialTo(VOLUME_RAMP_TIME, 1, audioElements[g][2]!)
                      dialTo(VOLUME_RAMP_TIME, 0, audioElements[g][2]!)
                    })
 
                currentAudio.play()
                //audioContext.resume().then(() => {
                  log(`played then unused AC status: ${audioContext.state}`)
                  dispatch({ type: "dismissModal" })
                //})
              }
            }}
          >Begin</button>
        </div></div>}

      <div className="wrapper">
        <header className="header"> I am standing in a museum... {false && Math.round(state.offset * 100) / 100}
          {GalleryNames.map(([description, gallery]) => (
            <audio key={gallery}
              ref={audioElements[gallery][0]}
              loop={true}
              preload="auto"
              controls
              src={`${Gallery[gallery]}.mp3`}
              className="begin" />
          ))}
        </header>
        <div className="menu"></div>
        <div className="gutter"></div>
        {iterationList.map((i, c) => {

          const src = `icon-${Gallery[state.gallery]}-${String(c).padStart(2, '0')}.svg`
          const gridArea = `iteration${Math.floor(c / 4)}${c % 4}`
          const className = `iteration 
                ${state.iteration === i ? "playing" : ""}
                gallery-${state.gallery}
              `;

          return (
            <span key={c} className={className} style={{ gridArea }}>
              {i === state.iteration && <BorderProgress fractionComplete={fractionComplete}></BorderProgress>}
              <img src={src}
                onClick={() => {
                  const currentAudio = getAudioElement(audioElements[state.gallery]);
                  if (currentAudio) {
                    currentAudio.play()
                    const targetTime = currentAudio.currentTime - LOOKBACK_ON_SWITCH
                    currentAudio.currentTime = (targetTime % ITERATION_DURATION) + c * ITERATION_DURATION
                    dispatch({
                      type: "requestIteration",
                      iteration: i
                    })
                  }
                }
                }>
              </img>
            </span>
          )
        }
        )}
        <footer className="footer">
          <div className="gallery-selection">
            {GalleryNames.map(([description, gallery]) => (
              <button
                key={gallery}
                onClick={() => {
                  const currentAudio = getAudioElement(audioElements[state.gallery]);
                  if (currentAudio) {
                    const atTime = currentAudio.currentTime;
                    log("Requeste gal at " + atTime)
                    const nextAudio = getAudioElement(audioElements[gallery])!;
                    nextAudio.play()
                    nextAudio.currentTime = atTime
                    GalleryNames.forEach(([desc, g]) => {
                      g !== gallery && dialTo(VOLUME_RAMP_TIME, 0, audioElements[g][2]!)
                    })
                    dialTo(VOLUME_RAMP_TIME, 1, audioElements[gallery][2]!)

                    setTimeout(() => {
                    dispatch({
                      type: "requestGallery",
                      gallery
                    })

                    })
                  }
                }}
                className={`
                ${state.gallery === gallery ? "selected" : "default"}
                ${Gallery[state.gallery]}
              `}>{description}</button>
            ))}
          </div>
          <div>
            Chazen et cetera. 2020.
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;