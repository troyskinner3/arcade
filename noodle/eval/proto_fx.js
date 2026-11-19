const PROTO=(()=>{ const PROJECT_BPM=120; const BAR_SECONDS=(60/PROJECT_BPM)*4; function barsToSeconds(b){ return b*BAR_SECONDS; }
const FX_CURVE_MIN_NODE_GAP = 0.0004;
const FX_DEFAULT_DROP_SEC = 0.02;
const FX_BOW_SUBSAMPLES = 12;
let longNoiseBufferCache=null, reverbImpulseCache=null;
const FX_EFFECTS = [
    { id: "highpass", label: "High Pass", icon: "📈", durationsBars: [2, 4, 8, 16],
      kind: "filter", filterType: "highpass", fromHz: 20, toHz: 15000 },
    { id: "lowpass", label: "Low Pass", icon: "📉", durationsBars: [2, 4, 8, 16],
      kind: "filter", filterType: "lowpass", fromHz: 20000, toHz: 20 },
    { id: "phaser", label: "Phaser", icon: "🌀", durationsBars: [2, 4, 8, 16],
      kind: "phaser", stages: 6, centerHz: 800, lfoRateHz: 0.3, lfoDepthHz: 600,
      fromWet: 0, toWet: 1,
      // Secondary, non-curve-controlled knobs a user can adjust per clip --
      // rendered as sliders beneath the graph (see renderFxParamControls).
      // `key` names the FX_EFFECTS field this overrides (clip.params[key],
      // falling back to this default when unset -- see fxParamValue). LFO
      // depth (±600Hz) stays a constant for now, not exposed as a control.
      params: [
        { key: "lfoRateHz", label: "LFO Rate", unit: "Hz", min: 0.05, max: 5, step: 0.01 },
        { key: "centerHz", label: "Center Freq", unit: "Hz", min: 200, max: 2000, step: 10 },
      ] },
    { id: "washout", label: "Washout", icon: "🌊", durationsBars: [2, 4, 8, 16],
      kind: "washout", fromHz: 20, toHz: 300, fromWet: 0, toWet: 1 },
    { id: "echo-throw", label: "Echo Throw", icon: "🔁", durationsBars: [2, 4, 8, 16],
      kind: "echo", delaySec: BAR_SECONDS / 8, feedback: 0.45, fromWet: 0, toWet: 1,
      // Delay time as note divisions (a bounded set of musically-meaningful
      // choices) rather than a continuous slider, which would mostly land
      // on values nobody would deliberately pick -- same reasoning real
      // delay plugins use for this exact control. "1/8." etc. is the
      // standard dotted-note shorthand (1.5x the plain note's duration).
      params: [
        { key: "delaySec", label: "Delay Time", type: "steps", options: [
          { value: BAR_SECONDS / 16, label: "1/16" },
          { value: BAR_SECONDS / 8, label: "1/8" },
          { value: BAR_SECONDS / 8 * 1.5, label: "1/8." },
          { value: BAR_SECONDS / 4, label: "1/4" },
          { value: BAR_SECONDS / 4 * 1.5, label: "1/4." },
          { value: BAR_SECONDS / 2, label: "1/2" },
        ] },
        { key: "feedback", label: "Feedback", min: 0, max: 0.85, step: 0.01 },
      ] },
    { id: "tremolo", label: "Tremolo", icon: "📳", durationsBars: [2, 4, 8, 16],
      kind: "tremolo", lfoRateHz: 5, fromWet: 0, toWet: 1,
      params: [{ key: "lfoRateHz", label: "LFO Rate", unit: "Hz", min: 0.5, max: 20, step: 0.1 }] },
    { id: "autopan", label: "Auto-Pan", icon: "↔️", durationsBars: [2, 4, 8, 16],
      kind: "autopan", lfoRateHz: 1, fromWet: 0, toWet: 1,
      params: [{ key: "lfoRateHz", label: "LFO Rate", unit: "Hz", min: 0.1, max: 10, step: 0.1 }] },
    { id: "bitcrush", label: "Bitcrusher", icon: "🕹️", durationsBars: [2, 4, 8, 16],
      // Sample-rate reduction (the other half of a classic bitcrusher,
      // giving it its gritty aliasing on top of this one's quantization
      // "steps") needs real-time sample-and-hold DSP a stock Web Audio
      // node can't do -- an AudioWorkletProcessor, not a quick add like
      // this one -- so bit-depth reduction alone for now.
      kind: "bitcrush", bitDepth: 4, fromWet: 0, toWet: 1,
      params: [{ key: "bitDepth", label: "Bit Depth", unit: "bit", min: 1, max: 16, step: 1 }] },
    { id: "vinylbrake", label: "Vinyl Brake", icon: "💿", durationsBars: [2, 4, 8, 16],
      // The classic real-time "tape stop" trick: ramping a DelayNode's
      // delayTime forces WebAudio to resample the signal to keep up,
      // which reads as a pitch drop -- paired with a darkening lowpass and
      // a volume fade so it sells the "record grinding to a halt" image.
      // Deliberately doesn't touch the real Vocal/Beats clip's own
      // playback rate at all: the song stays on tempo underneath, this
      // just colors the FX layer's copy of the signal passing through it.
      // No dry/wet split like Phaser/Washout/etc -- there's nothing to
      // blend against, the chain itself is silent-until-curved (near-zero
      // delay, wide-open filter, full gain at brake amount 0).
      kind: "vinylbrake", fromWet: 0, toWet: 1,
      maxDelaySec: 0.35, minHz: 700, minGain: 0.2 },
    { id: "reverse-swell", label: "Reverse Swell", icon: "🚀", durationsBars: [2, 4, 8, 16],
      // A real reversed-audio swell would need a reference to whichever
      // real Vocal/Beats clip(s) happen to sit underneath this FX clip --
      // zero, one, or several, depending on layering -- which FX units
      // have no way to know about today. So this is a synthesized
      // riser instead: filtered noise whose bandpass center sweeps upward
      // as it fades in, the standard EDM buildup texture. Same idea
      // Washout already uses for its synthetic reverb wash, just a sweep
      // instead of a wide "opening up" is the same shape (schedulePhaserSweep
      // for the dry/wet, scheduleFxSweep for the filter).
      kind: "reverse-swell", fromHz: 150, toHz: 9000, fromWet: 0, toWet: 1 },
    { id: "ringmod", label: "Ring Mod", icon: "🤖", durationsBars: [2, 4, 8, 16],
      // Architecturally almost identical to Tremolo -- an oscillator
      // driving a gain node -- just at audio-rate frequency instead of a
      // sub-20Hz LFO, and bipolar (swinging the full -1..1, not just
      // 0..1) so it actually multiplies in new sum/difference frequencies
      // rather than merely scaling volume. That's what gives ring
      // modulation its metallic/robotic character instead of Tremolo's
      // simple pulsing.
      kind: "ringmod", carrierHz: 250, fromWet: 0, toWet: 1,
      params: [{ key: "carrierHz", label: "Frequency", unit: "Hz", min: 20, max: 2000, step: 5 }] },
  ];
function fxEffectFor(effectId) { return FX_EFFECTS.find(e => e.id === effectId); }
function fxParamValue(clip, cfg, key) {
    return (clip.params && clip.params[key] !== undefined) ? clip.params[key] : cfg[key];
  }
function fxDefaultCurveNodes(totalDurSec) {
    // Rises across essentially the entire clip to a peak node sitting
    // FX_DEFAULT_DROP_SEC before the end node -- a fixed absolute
    // duration, not a fixed fraction, so the drop reads equally snappy on
    // a 4s clip and a 32s one. Falls back to the fraction-space safety
    // floor for a degenerate (zero/negative) duration.
    const dropFrac = totalDurSec > 0 ? Math.min(0.5, FX_DEFAULT_DROP_SEC / totalDurSec) : FX_CURVE_MIN_NODE_GAP;
    const peakT = 1 - Math.max(FX_CURVE_MIN_NODE_GAP, dropFrac);
    return [{ t: 0, v: 0 }, { t: peakT, v: 1 }, { t: 1, v: 0 }];
  }
function fxCurveValueAtT(nodes, t, segCurves) {
    if (t <= nodes[0].t) return nodes[0].v;
    if (t >= nodes[nodes.length - 1].t) return nodes[nodes.length - 1].v;
    for (let i = 0; i < nodes.length - 1; i++) {
      const p0 = nodes[i], p1 = nodes[i + 1];
      if (t <= p1.t) {
        const dt = p1.t - p0.t;
        const u = dt > 0 ? (t - p0.t) / dt : 0;
        const c = (segCurves && typeof segCurves[i] === "number") ? segCurves[i] : (p0.v + p1.v) / 2;
        const inv = 1 - u;
        return inv * inv * p0.v + 2 * inv * u * c + u * u * p1.v;
      }
    }
    return nodes[nodes.length - 1].v;
  }
function fxCurveFracAt(clip, linFrac) {
    const nodes = (clip.curve && clip.curve.nodes) || fxDefaultCurveNodes(barsToSeconds(clip.duration));
    const segCurves = clip.curve && clip.curve.curves;
    return Math.min(1, Math.max(0, fxCurveValueAtT(nodes, linFrac, segCurves)));
  }
function fxCurveScheduleBreakpoints(clip, totalDurSec, offsetIntoClipSec) {
    const nodes = (clip.curve && clip.curve.nodes) || fxDefaultCurveNodes(totalDurSec);
    const segCurves = clip.curve && clip.curve.curves;
    const startFrac = totalDurSec > 0 ? offsetIntoClipSec / totalDurSec : 1;
    const points = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const p0 = nodes[i], p1 = nodes[i + 1];
      if (p1.t <= startFrac) continue; // this whole segment is already in the past
      const steps = (segCurves && typeof segCurves[i] === "number") ? FX_BOW_SUBSAMPLES : 1;
      for (let s = 1; s <= steps; s++) {
        const t = p0.t + (p1.t - p0.t) * (s / steps);
        if (t <= startFrac) continue; // partway through this segment already
        points.push({ tSec: t * totalDurSec, frac: fxCurveValueAtT(nodes, t, segCurves) });
      }
    }
    return points;
  }
function scheduleFxSweep(node, cfg, clip, at, offsetIntoClipSec) {
    const totalDurSec = barsToSeconds(clip.duration);
    const startFrac = totalDurSec > 0 ? offsetIntoClipSec / totalDurSec : 1;
    const hzAt = (frac) => cfg.fromHz * Math.pow(cfg.toHz / cfg.fromHz, frac);
    const p = node.frequency;

    p.setValueAtTime(hzAt(fxCurveFracAt(clip, startFrac)), at);
    fxCurveScheduleBreakpoints(clip, totalDurSec, offsetIntoClipSec).forEach(({ tSec, frac }) => {
      p.exponentialRampToValueAtTime(hzAt(frac), at + (tSec - offsetIntoClipSec));
    });
  }
function schedulePhaserSweep(dryGain, wetGain, cfg, clip, at, offsetIntoClipSec) {
    const totalDurSec = barsToSeconds(clip.duration);
    const startFrac = totalDurSec > 0 ? offsetIntoClipSec / totalDurSec : 1;
    const wetAt = (frac) => cfg.fromWet + (cfg.toWet - cfg.fromWet) * frac;

    const startWet = wetAt(fxCurveFracAt(clip, startFrac));
    wetGain.gain.setValueAtTime(startWet, at);
    dryGain.gain.setValueAtTime(1 - startWet, at);
    fxCurveScheduleBreakpoints(clip, totalDurSec, offsetIntoClipSec).forEach(({ tSec, frac }) => {
      const w = wetAt(frac);
      const segAt = at + (tSec - offsetIntoClipSec);
      wetGain.gain.linearRampToValueAtTime(w, segAt);
      dryGain.gain.linearRampToValueAtTime(1 - w, segAt);
    });
  }
function fxDepthEnvelope(clip, cfg, offsetIntoClipSec) {
    const totalDurSec = barsToSeconds(clip.duration);
    const startFrac = totalDurSec > 0 ? offsetIntoClipSec / totalDurSec : 1;
    const depthAt = (frac) => cfg.fromWet + (cfg.toWet - cfg.fromWet) * frac;
    const points = [{ tSec: offsetIntoClipSec, depth: depthAt(fxCurveFracAt(clip, startFrac)) }];
    fxCurveScheduleBreakpoints(clip, totalDurSec, offsetIntoClipSec).forEach(({ tSec, frac }) => {
      points.push({ tSec, depth: depthAt(frac) });
    });
    return points;
  }
function fxBitcrushCurve(bitDepth) {
    const steps = Math.pow(2, bitDepth);
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    return curve;
  }
function buildFxUnit(ctx, clip, track) {
    const cfg = fxEffectFor(clip.effectId);
    if (cfg.kind === "phaser") {
      // input -> dryGain -> output
      //       -> allpass x stages (shared LFO modulates all of them in
      //          phase, which is what creates the moving notches) -> wetGain -> output
      const input = track(ctx.createGain());
      const output = track(ctx.createGain());
      const dryGain = track(ctx.createGain());
      const wetGain = track(ctx.createGain());
      dryGain.gain.value = 1;
      wetGain.gain.value = 0;
      input.connect(dryGain).connect(output);

      let node = input;
      const allpasses = [];
      const centerHz = fxParamValue(clip, cfg, "centerHz");
      for (let i = 0; i < cfg.stages; i++) {
        const ap = track(ctx.createBiquadFilter());
        ap.type = "allpass";
        ap.frequency.value = centerHz;
        node.connect(ap);
        node = ap;
        allpasses.push(ap);
      }
      node.connect(wetGain).connect(output);

      const lfo = track(ctx.createOscillator());
      lfo.type = "sine";
      lfo.frequency.value = fxParamValue(clip, cfg, "lfoRateHz");
      const lfoDepth = track(ctx.createGain());
      lfoDepth.gain.value = cfg.lfoDepthHz;
      lfo.connect(lfoDepth);
      allpasses.forEach(ap => lfoDepth.connect(ap.frequency));
      lfo.start();

      return { clip, input, output, automate: (at, offset) => schedulePhaserSweep(dryGain, wetGain, cfg, clip, at, offset) };
    }
    if (cfg.kind === "washout") {
      // input -> dryGain -----------------\
      //       -> convolver -> wetGain ----- +--> highpass -> output
      // Dry/wet and the highpass cutoff are automated by the same shaped
      // envelope, so this just calls both existing scheduling functions
      // (each reads only the cfg fields it cares about) rather than
      // needing new curve math.
      const input = track(ctx.createGain());
      const output = track(ctx.createGain());
      const dryGain = track(ctx.createGain());
      const wetGain = track(ctx.createGain());
      dryGain.gain.value = 1;
      wetGain.gain.value = 0;
      const convolver = track(ctx.createConvolver());
      convolver.buffer = reverbImpulseBuffer(ctx);
      convolver.normalize = true;
      const filter = track(ctx.createBiquadFilter());
      filter.type = "highpass";
      filter.frequency.value = cfg.fromHz;

      input.connect(dryGain).connect(filter);
      input.connect(convolver).connect(wetGain).connect(filter);
      filter.connect(output);

      return {
        clip, input, output,
        automate: (at, offset) => {
          schedulePhaserSweep(dryGain, wetGain, cfg, clip, at, offset);
          scheduleFxSweep(filter, cfg, clip, at, offset || 0);
        },
      };
    }
    if (cfg.kind === "echo") {
      // input -> dryGain -----------------\
      //       -> delay (with feedback) ---- +--> output
      // Delay time and feedback are per-clip params (see FX_EFFECTS'
      // `params`), not curve-controlled -- only the dry/wet balance ramps
      // in, so a longer hold on the effect means the repeats increasingly
      // dominate. Max delay bumped to 1.5s (from the 1s a plain
      // createDelay(1) call would cap at) so the longest note division
      // option (a half note, 1s at the locked 120bpm) has headroom.
      const input = track(ctx.createGain());
      const output = track(ctx.createGain());
      const dryGain = track(ctx.createGain());
      const wetGain = track(ctx.createGain());
      dryGain.gain.value = 1;
      wetGain.gain.value = 0;
      const delay = track(ctx.createDelay(1.5));
      delay.delayTime.value = fxParamValue(clip, cfg, "delaySec");
      const feedback = track(ctx.createGain());
      feedback.gain.value = fxParamValue(clip, cfg, "feedback");

      input.connect(dryGain).connect(output);
      input.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(wetGain).connect(output);

      return { clip, input, output, automate: (at, offset) => schedulePhaserSweep(dryGain, wetGain, cfg, clip, at, offset) };
    }
    if (cfg.kind === "tremolo") {
      // input -> gain (base value + LFO modulation) -> output. Depth 0
      // leaves gain pinned at 1 (no modulation, no effect); depth 1 makes
      // gain swing the full 0..1 range (silence at each trough) -- so the
      // base sits at 1-depth/2 and the LFO's own swing is scaled to
      // ±depth/2, keeping the two in lockstep off one depth value per
      // fxDepthEnvelope point rather than two independently-curved params.
      const gain = track(ctx.createGain());
      gain.gain.value = 1;
      const lfo = track(ctx.createOscillator());
      lfo.type = "sine";
      lfo.frequency.value = fxParamValue(clip, cfg, "lfoRateHz");
      const lfoDepth = track(ctx.createGain());
      lfoDepth.gain.value = 0;
      lfo.connect(lfoDepth).connect(gain.gain);
      lfo.start();
      return {
        clip, input: gain, output: gain,
        automate: (at, offset) => {
          fxDepthEnvelope(clip, cfg, offset).forEach(({ tSec, depth }, i) => {
            const atTime = at + (tSec - offset);
            const method = i === 0 ? "setValueAtTime" : "linearRampToValueAtTime";
            gain.gain[method](1 - depth / 2, atTime);
            lfoDepth.gain[method](depth / 2, atTime);
          });
        },
      };
    }
    if (cfg.kind === "autopan") {
      // input -> panner (center 0 + LFO modulation) -> output. Depth
      // directly scales how far the LFO swings the pan position (0 = dead
      // center, no movement; 1 = the full -1..1 stereo width) -- the
      // panner's own base pan value never needs to move, only the LFO's
      // depth does, so this is a single param out of fxDepthEnvelope
      // rather than tremolo's related pair.
      const panner = track(ctx.createStereoPanner());
      panner.pan.value = 0;
      const lfo = track(ctx.createOscillator());
      lfo.type = "sine";
      lfo.frequency.value = fxParamValue(clip, cfg, "lfoRateHz");
      const lfoDepth = track(ctx.createGain());
      lfoDepth.gain.value = 0;
      lfo.connect(lfoDepth).connect(panner.pan);
      lfo.start();
      return {
        clip, input: panner, output: panner,
        automate: (at, offset) => {
          panner.pan.setValueAtTime(0, at);
          fxDepthEnvelope(clip, cfg, offset).forEach(({ tSec, depth }, i) => {
            const atTime = at + (tSec - offset);
            lfoDepth.gain[i === 0 ? "setValueAtTime" : "linearRampToValueAtTime"](depth, atTime);
          });
        },
      };
    }
    if (cfg.kind === "bitcrush") {
      // input -> dryGain -----------------\
      //       -> waveshaper (bit-depth quantization) -> wetGain --- +--> output
      // Same dry/wet crossfade shape as phaser/washout/echo -- the curve
      // controls how much of the crushed signal blends in, not the crush
      // amount itself (that's the Bit Depth slider, baked into the
      // WaveShaper's curve at build time).
      const input = track(ctx.createGain());
      const output = track(ctx.createGain());
      const dryGain = track(ctx.createGain());
      const wetGain = track(ctx.createGain());
      dryGain.gain.value = 1;
      wetGain.gain.value = 0;
      const shaper = track(ctx.createWaveShaper());
      shaper.curve = fxBitcrushCurve(fxParamValue(clip, cfg, "bitDepth"));

      input.connect(dryGain).connect(output);
      input.connect(shaper).connect(wetGain).connect(output);

      return { clip, input, output, automate: (at, offset) => schedulePhaserSweep(dryGain, wetGain, cfg, clip, at, offset) };
    }
    if (cfg.kind === "vinylbrake") {
      // input -> delay (ramping time forces a real-time pitch drop) ->
      //   lowpass (darkens as brake amount rises) -> gain (fades down) ->
      //   output. All three driven off one shared 0..1 "brake amount"
      // envelope (fxDepthEnvelope, same helper Tremolo/Auto-Pan use for
      // their depth), so there's a single curve to reason about even
      // though it's shaping three different params in series.
      const delay = track(ctx.createDelay(1));
      delay.delayTime.value = 0.002;
      const filter = track(ctx.createBiquadFilter());
      filter.type = "lowpass";
      filter.frequency.value = 20000;
      const gain = track(ctx.createGain());
      gain.gain.value = 1;
      delay.connect(filter).connect(gain);

      return {
        clip, input: delay, output: gain,
        automate: (at, offset) => {
          fxDepthEnvelope(clip, cfg, offset).forEach(({ tSec, depth }, i) => {
            const atTime = at + (tSec - offset);
            const method = i === 0 ? "setValueAtTime" : "linearRampToValueAtTime";
            delay.delayTime[method](0.002 + depth * cfg.maxDelaySec, atTime);
            filter.frequency[method](20000 - depth * (20000 - cfg.minHz), atTime);
            gain.gain[method](1 - depth * (1 - cfg.minGain), atTime);
          });
        },
      };
    }
    if (cfg.kind === "reverse-swell") {
      // input -> dryGain ------------------------------------\
      // (independent) noise -> bandpass (sweeping up) -> wetGain --+--> output
      // The wet path is a synthesized texture, not a processed copy of
      // the input -- there's no real clip reference to reverse here (see
      // the FX_EFFECTS comment above) -- so the noise source runs on its
      // own, always-on loop, and only the dry/wet balance and the
      // bandpass sweep are curve-automated. Exactly Washout's own
      // schedulePhaserSweep + scheduleFxSweep pairing.
      const input = track(ctx.createGain());
      const output = track(ctx.createGain());
      const dryGain = track(ctx.createGain());
      const wetGain = track(ctx.createGain());
      dryGain.gain.value = 1;
      wetGain.gain.value = 0;
      input.connect(dryGain).connect(output);

      const noise = track(ctx.createBufferSource());
      noise.buffer = longNoiseBuffer(ctx);
      noise.loop = true;
      const filter = track(ctx.createBiquadFilter());
      filter.type = "bandpass";
      filter.Q.value = 1.2;
      filter.frequency.value = cfg.fromHz;
      noise.connect(filter).connect(wetGain).connect(output);
      noise.start();

      return {
        clip, input, output,
        automate: (at, offset) => {
          schedulePhaserSweep(dryGain, wetGain, cfg, clip, at, offset);
          scheduleFxSweep(filter, cfg, clip, at, offset || 0);
        },
      };
    }
    if (cfg.kind === "ringmod") {
      // input -> dryGain -----------------------------------------\
      //       -> ringGain (gain param driven directly, at audio rate, by
      //          a bipolar carrier oscillator) -> wetGain ----------+--> output
      // Multiplying the signal by a carrier that swings the full -1..1
      // range (rather than Tremolo's unipolar 0..1 LFO) is what actually
      // produces ring modulation's new sum/difference frequencies instead
      // of a plain volume pulse -- so ringGain's base gain stays at 0 and
      // the carrier alone drives it. Same dry/wet crossfade shape as
      // Phaser/Washout/Echo/Bitcrusher.
      const input = track(ctx.createGain());
      const output = track(ctx.createGain());
      const dryGain = track(ctx.createGain());
      const wetGain = track(ctx.createGain());
      dryGain.gain.value = 1;
      wetGain.gain.value = 0;
      const ringGain = track(ctx.createGain());
      ringGain.gain.value = 0;
      const carrier = track(ctx.createOscillator());
      carrier.type = "sine";
      carrier.frequency.value = fxParamValue(clip, cfg, "carrierHz");
      carrier.connect(ringGain.gain);
      carrier.start();

      input.connect(dryGain).connect(output);
      input.connect(ringGain).connect(wetGain).connect(output);

      return { clip, input, output, automate: (at, offset) => schedulePhaserSweep(dryGain, wetGain, cfg, clip, at, offset) };
    }
    // Default: a filter sweep (high/low pass) -- one BiquadFilterNode is
    // both the unit's input and its output.
    const node = track(ctx.createBiquadFilter());
    node.type = cfg.filterType;
    node.frequency.value = cfg.fromHz;
    return { clip, input: node, output: node, automate: (at, offset) => scheduleFxSweep(node, cfg, clip, at, offset || 0) };
  }
function reverbImpulseBuffer(ctx) {
    if (reverbImpulseCache && reverbImpulseCache.ctx === ctx) return reverbImpulseCache.buf;
    const durationSec = 2.5;
    const decay = 3;
    const len = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    reverbImpulseCache = { ctx, buf };
    return buf;
  }
function longNoiseBuffer(ctx) {
    if (longNoiseBufferCache && longNoiseBufferCache.ctx === ctx) return longNoiseBufferCache.buf;
    const len = Math.floor(ctx.sampleRate * 3);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    longNoiseBufferCache = { ctx, buf };
    return buf;
  }
return {FX_EFFECTS, buildFxUnit, fxCurveFracAt}; })();
