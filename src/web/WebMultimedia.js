'use strict';

/**
 * 🎥 WebMultimedia v1.0 — Browser Multimedia Engine for Dolphin Web Target
 * WebCam Access, Microphone Recording, HTML5 Video & Local File Pickers with Graceful Fallbacks
 */
class WebMultimedia {
    static getClientScript() {
        return `
        // 🎙️ Web Voice Microphone Recording Handler
        window.DolphinWebMic = {
            mediaRecorder: null,
            audioChunks: [],
            recordedBlob: null,
            recordedUrl: '',

            start: function(state, updateDOM) {
                var self = this;
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    self.fallbackAudioPicker(state, updateDOM);
                    return;
                }
                navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
                    self.audioChunks = [];
                    self.mediaRecorder = new MediaRecorder(stream);
                    self.mediaRecorder.ondataavailable = function(e) {
                        if (e.data.size > 0) self.audioChunks.push(e.data);
                    };
                    self.mediaRecorder.onstop = function() {
                        self.recordedBlob = new Blob(self.audioChunks, { type: 'audio/webm' });
                        self.recordedUrl = URL.createObjectURL(self.recordedBlob);
                        state.sys_mic_status = 'Voice Recorded! 🎙️ (Ready to play)';
                        if (updateDOM) updateDOM();
                    };
                    self.mediaRecorder.start();
                    state.sys_mic_status = 'Recording Voice... 🔴';
                    if (updateDOM) updateDOM();
                }).catch(function(err) {
                    // Graceful fallback for PCs without physical Mic Hardware
                    state.sys_mic_status = 'Mic Hardware Not Detected — Select Audio File 🎙️';
                    if (updateDOM) updateDOM();
                    self.fallbackAudioPicker(state, updateDOM);
                });
            },

            fallbackAudioPicker: function(state, updateDOM) {
                var self = this;
                var input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.onchange = function(e) {
                    var file = e.target.files[0];
                    if (file) {
                        self.recordedUrl = URL.createObjectURL(file);
                        state.sys_mic_status = 'Selected Audio: ' + file.name + ' 🎵';
                        state.sys_picked_audio_name = file.name;
                        state.sys_picked_audio_url = self.recordedUrl;
                        if (updateDOM) updateDOM();
                    }
                };
                input.click();
            },

            stop: function(state, updateDOM) {
                if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                    this.mediaRecorder.stop();
                    this.mediaRecorder.stream.getTracks().forEach(function(track) { track.stop(); });
                } else if (this.recordedUrl) {
                    state.sys_mic_status = 'Audio File Ready to Play! 🎙️';
                    if (updateDOM) updateDOM();
                }
            },

            play: function(state, updateDOM) {
                if (this.recordedUrl) {
                    var a = new Audio(this.recordedUrl);
                    a.play().catch(function() {});
                    state.sys_mic_status = 'Playing Audio Stream... ▶️';
                    if (updateDOM) updateDOM();
                } else {
                    this.fallbackAudioPicker(state, updateDOM);
                }
            }
        };

        // 📷 Web Camera & File Picker Handler with Graceful Fallback
        window.DolphinWebCamera = {
            snapOrPick: function(acceptType, state, updateDOM, callback) {
                var self = this;
                self.pickFile(acceptType, state, updateDOM, callback);
            },
            pickFile: function(acceptType, state, updateDOM, callback) {
                var input = document.createElement('input');
                input.type = 'file';
                input.accept = acceptType || '*/*';
                input.onchange = function(e) {
                    var file = e.target.files[0];
                    if (file) {
                        var url = URL.createObjectURL(file);
                        if (callback) callback(file, url);
                    }
                };
                input.click();
            }
        };

        // 🎨 64-Channel HTML5 Canvas Video Engine for Web Browser Target (Opcode 0x61)
        window.initTitanWebCanvas = function() {
            var canvas = document.querySelector('canvas[data-nvr="true"]') || document.querySelector('canvas[type="0x61"]') || document.querySelector('[type="0x61"]');
            if (!canvas || canvas.getAttribute('data-titan-inited') || canvas.getAttribute('data-nvr-ignore')) return;
            canvas.setAttribute('data-titan-inited', 'true');

            canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth || 1280 : 1280;
            canvas.height = Math.round(canvas.width * (9 / 16));
            var ctx = canvas.getContext('2d');
            if (!ctx) return;

            var baseUrl = canvas.getAttribute('src') || canvas.getAttribute('data-src') || (window.location.protocol + '//' + window.location.hostname + ':9094');
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

            var columns = 8;
            var rows = 8;
            var images = {};
            var selectedCam = -1;

            function drawGrid() {
                var w = canvas.width;
                var h = canvas.height;
                ctx.fillStyle = '#020817';
                ctx.fillRect(0, 0, w, h);

                if (selectedCam > 0) {
                    // Fullscreen Zoom View
                    var formattedId = selectedCam < 10 ? 'cam_0' + selectedCam : 'cam_' + selectedCam;
                    var img = images[selectedCam];
                    if (img && img.complete && img.naturalWidth !== 0) {
                        ctx.drawImage(img, 0, 0, w, h);
                    } else {
                        ctx.fillStyle = '#0f172a';
                        ctx.fillRect(0, 0, w, h);
                    }
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(0, 0, w, h);
                    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
                    ctx.fillRect(10, 10, 260, 40);
                    ctx.fillStyle = '#38bdf8';
                    ctx.font = 'bold 18px sans-serif';
                    ctx.fillText('📹 CH' + (selectedCam < 10 ? '0' + selectedCam : selectedCam) + ' - FULLSCREEN VIEW', 20, 36);
                    return;
                }

                var cellW = w / columns;
                var cellH = h / rows;

                for (var r = 0; r < rows; r++) {
                    for (var c = 0; c < columns; c++) {
                        var camId = r * columns + c + 1;
                        var x = c * cellW;
                        var y = r * cellH;

                        var img = images[camId];
                        if (img && img.complete && img.naturalWidth !== 0) {
                            ctx.drawImage(img, x, y, cellW, cellH);
                        } else {
                            ctx.fillStyle = '#0a0f1e';
                            ctx.fillRect(x, y, cellW, cellH);
                        }

                        // OSD Grid Border
                        ctx.strokeStyle = '#1e3a5f';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x, y, cellW, cellH);

                        // OSD Header
                        ctx.fillStyle = 'rgba(2, 8, 23, 0.75)';
                        ctx.fillRect(x + 2, y + 2, cellW - 4, 18);
                        ctx.fillStyle = '#38bdf8';
                        ctx.font = 'bold 10px monospace';
                        ctx.fillText('CH' + (camId < 10 ? '0' + camId : camId), x + 6, y + 14);

                        // REC Badge
                        ctx.fillStyle = '#ef4444';
                        ctx.beginPath();
                        ctx.arc(x + cellW - 10, y + 10, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            function fetchSnapshots() {
                for (var id = 1; id <= 64; id++) {
                    (function(camId) {
                        var formattedId = camId < 10 ? 'cam_0' + camId : 'cam_' + camId;
                        var img = new Image();
                        img.onload = function() {
                            images[camId] = img;
                            drawGrid();
                        };
                        img.src = baseUrl + '/nvr/snapshot/' + formattedId + '?t=' + Date.now();
                    })(id);
                }
            }

            canvas.addEventListener('click', function(e) {
                var rect = canvas.getBoundingClientRect();
                var clickX = e.clientX - rect.left;
                var clickY = e.clientY - rect.top;
                if (selectedCam > 0) {
                    selectedCam = -1;
                } else {
                    var cellW = canvas.width / columns;
                    var cellH = canvas.height / rows;
                    var col = Math.floor(clickX / cellW);
                    var row = Math.floor(clickY / cellH);
                    selectedCam = row * columns + col + 1;
                }
                drawGrid();
            });

            drawGrid();
            fetchSnapshots();
            setInterval(fetchSnapshots, 2000);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', window.initTitanWebCanvas);
        } else {
            setTimeout(window.initTitanWebCanvas, 100);
        }

        // 🎬 Titan Video Studio — Bi-Directional Gizmo, Slider, Clip & SSE Sync Engine
        window.initTitanVideoStudio = function() {
            var video = document.querySelector('video') || document.getElementById('titanVideoPlayer');
            var needle = document.getElementById('titanPlayheadNeedle');
            var gizmo = document.getElementById('titanTransformGizmo');
            var stage = document.getElementById('titanCinemaStage');
            var slider = document.getElementById('titanStudioSlider') || document.querySelector('input[type="range"][data-state-key="sliderVal"]');
            var clip = document.getElementById('titanActiveClip');
            var handleL = document.getElementById('titanClipHandleLeft');
            var handleR = document.getElementById('titanClipHandleRight');

            if (!video) return;

            // 1. Ensure video loads metadata and is unmuted on interaction
            video.preload = 'auto';
            video.playsInline = true;
            if (video.paused) {
                video.addEventListener('loadedmetadata', function() {
                    if (video.currentTime === 0) video.currentTime = 0.05;
                }, { once: true });
            }

            // 2. Play / Pause & Stage Tap
            function togglePlayback() {
                if (video.paused) {
                    video.play().catch(function() {});
                    if (window.DolphinWebStore) window.DolphinWebStore.set('isPlaying', true);
                } else {
                    video.pause();
                    if (window.DolphinWebStore) window.DolphinWebStore.set('isPlaying', false);
                }
            }
            if (stage) {
                stage.addEventListener('click', function(e) {
                    if (e.target.closest && (e.target.closest('.gizmo-handle') || e.target.closest('.gizmo-rotate-knob') || e.target.closest('.gizmo-delete-btn') || e.target.closest('button'))) return;
                    togglePlayback();
                });
            }

            // 3. Video timeupdate -> Move Playhead Needle & update timecode
            video.addEventListener('timeupdate', function() {
                var cur = video.currentTime || 0;
                var dur = video.duration || 10;
                var pct = Math.min(1, Math.max(0, cur / dur));

                var mins = Math.floor(cur / 60);
                var secs = Math.floor(cur % 60);
                var ms = Math.floor((cur % 1) * 30);
                var tc = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs + ':' + (ms < 10 ? '0' : '') + ms;

                var tcElements = document.querySelectorAll('[data-state-key="currentTime"], [data-bus="1002"]');
                tcElements.forEach(function(el) { el.textContent = tc; });

                if (needle) {
                    var timelineDeck = needle.parentElement || document.querySelector('.timeline-deck');
                    var deckWidth = (timelineDeck ? timelineDeck.clientWidth - 50 : 280) || 280;
                    var xPos = pct * deckWidth;
                    needle.style.transform = 'translateX(' + xPos.toFixed(1) + 'px)';
                }
            });

            // 4. Click Timeline to Seek Playhead
            var timelineContainer = document.getElementById('titanTimelineTrackContainer') || document.querySelector('[action="app.selectVideoLane"]') || (needle && needle.parentElement);
            if (timelineContainer) {
                timelineContainer.addEventListener('click', function(e) {
                    if (e.target.closest && e.target.closest('#titanActiveClip')) return;
                    var rect = timelineContainer.getBoundingClientRect();
                    var clickX = e.clientX - rect.left;
                    var ratio = Math.max(0, Math.min(1, clickX / rect.width));
                    if (video.duration) {
                        video.currentTime = ratio * video.duration;
                    }
                });
            }

            // 5. Bi-directional Gizmo Interaction (Touch & Mouse Drag) with Re-entrancy Protection
            var isApplyingTransform = false;
            function applyTransform(z, r, px, py, isUserDrag) {
                if (isApplyingTransform) return;
                isApplyingTransform = true;
                try {
                    var scale = Math.max(0.2, z / 100);
                    var tf = 'translate3d(' + px + 'px, ' + py + 'px, 0px) scale(' + scale.toFixed(3) + ') rotate(' + r.toFixed(1) + 'deg)';
                    if (video) video.style.transform = tf;
                    if (gizmo) gizmo.style.transform = tf;
                    if (isUserDrag && window.DolphinWebStore && window.DolphinWebStore.state) {
                        window.DolphinWebStore.state['zoom'] = Math.round(z);
                        window.DolphinWebStore.state['rotation'] = Math.round(r);
                        window.DolphinWebStore.state['canvasTransform'] = tf;
                    }
                } finally {
                    isApplyingTransform = false;
                }
            }

            if (gizmo) {
                var isGizmoDragging = false;
                var gizmoDragType = '';
                var gStartX = 0, gStartY = 0;
                var gStartZoom = 100, gStartRot = 0, gStartPanX = 0, gStartPanY = 0;

                gizmo.addEventListener('pointerdown', function(e) {
                    var target = e.target;
                    if (target.classList && target.classList.contains('gizmo-handle')) {
                        gizmoDragType = 'scale';
                    } else if (target.classList && target.classList.contains('gizmo-rotate-knob')) {
                        gizmoDragType = 'rotate';
                    } else if (target.classList && target.classList.contains('gizmo-delete-btn')) {
                        applyTransform(100, 0, 0, 0, true);
                        fetch('/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'state:zoom:=100', value: '100' }) }).catch(function(){});
                        return;
                    } else {
                        gizmoDragType = 'pan';
                    }
                    isGizmoDragging = true;
                    gizmo.setPointerCapture(e.pointerId);
                    gStartX = e.clientX;
                    gStartY = e.clientY;
                    gStartZoom = (window.DolphinWebStore && window.DolphinWebStore.get('zoom')) || 100;
                    gStartRot = (window.DolphinWebStore && window.DolphinWebStore.get('rotation')) || 0;
                    gStartPanX = (window.DolphinWebStore && window.DolphinWebStore.get('panX')) || 0;
                    gStartPanY = (window.DolphinWebStore && window.DolphinWebStore.get('panY')) || 0;
                    e.stopPropagation();
                    e.preventDefault();
                });

                gizmo.addEventListener('pointermove', function(e) {
                    if (!isGizmoDragging) return;
                    var dx = e.clientX - gStartX;
                    var dy = e.clientY - gStartY;

                    if (gizmoDragType === 'scale') {
                        var delta = (dx + dy) * 0.5;
                        var newZoom = Math.max(20, Math.min(400, gStartZoom + delta));
                        applyTransform(newZoom, gStartRot, gStartPanX, gStartPanY, true);
                    } else if (gizmoDragType === 'rotate') {
                        var newRot = (gStartRot + dx * 0.8) % 360;
                        applyTransform(gStartZoom, newRot, gStartPanX, gStartPanY, true);
                    } else if (gizmoDragType === 'pan') {
                        applyTransform(gStartZoom, gStartRot, gStartPanX + dx, gStartPanY + dy, true);
                    }
                });

                gizmo.addEventListener('pointerup', function(e) {
                    if (isGizmoDragging) {
                        isGizmoDragging = false;
                        try { gizmo.releasePointerCapture(e.pointerId); } catch(err) {}
                        var curZ = Math.round((window.DolphinWebStore && window.DolphinWebStore.get('zoom')) || 100);
                        var curR = Math.round((window.DolphinWebStore && window.DolphinWebStore.get('rotation')) || 0);
                        fetch('/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'state:zoom:=' + curZ, value: String(curZ) }) }).catch(function(){});
                        fetch('/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'state:rotation:=' + curR, value: String(curR) }) }).catch(function(){});
                    }
                });
            }

            // 6. Real Continuous Interactive Hardware Slider (60 FPS Bi-directional Sync)
            if (slider) {
                var sliderSendTimer = null;
                slider.addEventListener('input', function(e) {
                    var rawVal = Number(slider.value) || 0;
                    var param = (window.DolphinWebStore && window.DolphinWebStore.get('sliderParam')) || 'Speed';
                    var disp = '';

                    if (param.includes('Speed')) {
                        var mappedSpeed = Math.round(10 + (rawVal / 255) * 390);
                        var rate = mappedSpeed / 100;
                        video.playbackRate = Math.max(0.1, rate);
                        disp = rate.toFixed(1) + 'x';
                    } else if (param.includes('Zoom')) {
                        var mappedZoom = Math.round(20 + (rawVal / 255) * 380);
                        disp = mappedZoom + '%';
                        var curR = (window.DolphinWebStore && window.DolphinWebStore.get('rotation')) || 0;
                        applyTransform(mappedZoom, curR, 0, 0, false);
                    } else if (param.includes('Rotate')) {
                        var mappedRot = Math.round((rawVal / 255) * 360);
                        disp = mappedRot + '°';
                        var curZ = (window.DolphinWebStore && window.DolphinWebStore.get('zoom')) || 100;
                        applyTransform(curZ, mappedRot, 0, 0, false);
                    } else if (param.includes('Volume')) {
                        var mappedVol = Math.round((rawVal / 255) * 200);
                        disp = mappedVol === 0 ? 'Mute' : mappedVol + '%';
                        video.volume = Math.max(0, Math.min(1, mappedVol / 100));
                        video.muted = mappedVol === 0;
                    } else if (param.includes('Opacity')) {
                        var mappedOp = Math.round((rawVal / 255) * 100);
                        disp = mappedOp + '%';
                        video.style.opacity = (mappedOp / 100).toFixed(2);
                    } else {
                        disp = rawVal + '%';
                    }

                    if (window.DolphinWebStore && window.DolphinWebStore.state) {
                        window.DolphinWebStore.state['sliderVal'] = rawVal;
                        window.DolphinWebStore.state['sliderDisplayVal'] = disp;
                    }

                    document.querySelectorAll('[data-state-key="sliderDisplayVal"]').forEach(function(el) { el.textContent = disp; });
                    document.querySelectorAll('[data-state-key="status"]').forEach(function(el) { el.textContent = '⚡ ' + param + ': ' + disp; });

                    clearTimeout(sliderSendTimer);
                    sliderSendTimer = setTimeout(function() {
                        fetch('/action', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'app.onSliderChange', value: String(rawVal) })
                        }).catch(function(){});
                    }, 60);
                });
            }

            // 7. Media Lane Clip Drag & Drag-To-Grow Engine
            if (clip) {
                var isClipDragging = false;
                var clipDragMode = 'move'; // 'move' | 'grow-right' | 'grow-left'
                var cStartMouseX = 0;
                var cStartLeft = Number(window.DolphinWebStore && window.DolphinWebStore.get('clipStart')) || 20;
                var cStartWidth = Number(window.DolphinWebStore && window.DolphinWebStore.get('clipWidth')) || 140;

                clip.style.left = cStartLeft + 'px';
                clip.style.width = cStartWidth + 'px';

                clip.addEventListener('pointerdown', function(e) {
                    var target = e.target;
                    if (target === handleR || (handleR && handleR.contains(target))) {
                        clipDragMode = 'grow-right';
                    } else if (target === handleL || (handleL && handleL.contains(target))) {
                        clipDragMode = 'grow-left';
                    } else {
                        clipDragMode = 'move';
                    }
                    isClipDragging = true;
                    clip.setPointerCapture(e.pointerId);
                    cStartMouseX = e.clientX;
                    cStartLeft = parseInt(clip.style.left, 10) || 20;
                    cStartWidth = parseInt(clip.style.width, 10) || 140;
                    e.stopPropagation();
                    e.preventDefault();
                });

                clip.addEventListener('pointermove', function(e) {
                    if (!isClipDragging) return;
                    var dx = e.clientX - cStartMouseX;

                    if (clipDragMode === 'move') {
                        var newLeft = Math.max(0, Math.min(240, cStartLeft + dx));
                        clip.style.left = newLeft + 'px';
                    } else if (clipDragMode === 'grow-right') {
                        var newWidth = Math.max(30, Math.min(270 - cStartLeft, cStartWidth + dx));
                        clip.style.width = newWidth + 'px';
                    } else if (clipDragMode === 'grow-left') {
                        var newLeft = Math.max(0, Math.min(cStartLeft + cStartWidth - 30, cStartLeft + dx));
                        var newWidth = cStartWidth - (newLeft - cStartLeft);
                        clip.style.left = newLeft + 'px';
                        clip.style.width = newWidth + 'px';
                    }
                });

                clip.addEventListener('pointerup', function(e) {
                    if (isClipDragging) {
                        isClipDragging = false;
                        try { clip.releasePointerCapture(e.pointerId); } catch(err) {}
                        var curL = parseInt(clip.style.left, 10) || 20;
                        var curW = parseInt(clip.style.width, 10) || 140;
                        if (window.DolphinWebStore && window.DolphinWebStore.state) {
                            window.DolphinWebStore.state['clipStart'] = curL;
                            window.DolphinWebStore.state['clipWidth'] = curW;
                        }
                        fetch('/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'state:clipStart:=' + curL, value: String(curL) }) }).catch(function(){});
                        fetch('/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'state:clipWidth:=' + curW, value: String(curW) }) }).catch(function(){});
                    }
                });
            }

            // 8. Universal Reactive State Patch Handlers (0ms SSE Stream Synchronizer)
            window.onTitanStatePatch = function(key, value) {
                if (!key) return;
                var numVal = Number(value);

                if (key === 'clipStart') {
                    if (clip) clip.style.left = (numVal || 0) + 'px';
                } else if (key === 'clipWidth') {
                    if (clip) clip.style.width = (numVal || 140) + 'px';
                } else if (key === 'sliderVal') {
                    if (slider && document.activeElement !== slider) slider.value = value;
                } else if (key === 'canvasTransform') {
                    if (video) video.style.transform = value;
                    if (gizmo) gizmo.style.transform = value;
                } else if (key === 'zoom' || key === 'scale') {
                    var curR = (window.DolphinWebStore && window.DolphinWebStore.get('rotation')) || 0;
                    applyTransform(numVal || 100, curR, 0, 0, false);
                } else if (key === 'rotation') {
                    var curZ = (window.DolphinWebStore && window.DolphinWebStore.get('zoom')) || 100;
                    applyTransform(curZ, numVal || 0, 0, 0, false);
                } else if (key === 'isPlaying') {
                    if (value === true || value === 'true' || value === 1) {
                        video.play().catch(function(){});
                    } else {
                        video.pause();
                    }
                } else if (key === 'speed') {
                    video.playbackRate = Math.max(0.1, (numVal || 100) / 100);
                } else if (key === 'volume') {
                    video.volume = Math.max(0, Math.min(1, (numVal || 100) / 100));
                } else if (key === 'isMuted') {
                    video.muted = (value === true || value === 'true' || value === 1);
                } else if (key === 'opacity') {
                    video.style.opacity = Math.max(0, Math.min(1, (numVal || 100) / 100));
                } else if (key === 'activeClipName') {
                    var clipLabel = clip ? clip.querySelector('span') : null;
                    if (clipLabel) clipLabel.textContent = value;
                } else if (key === 'sys_picked_video_url' || key === 'videoSrc') {
                    if (video && value && video.src !== value) {
                        video.src = value;
                        video.load();
                    }
                }
            };
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', window.initTitanVideoStudio);
        } else {
            setTimeout(window.initTitanVideoStudio, 150);
        }
        `;
    }
}

module.exports = WebMultimedia;
