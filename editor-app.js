// editor-app.js
(() => {
  // DOM
  const canvas = document.getElementById('editor-canvas');
  const ctx = canvas.getContext('2d');
  const fileImage = document.getElementById('file-image');
  const btnAddImage = document.getElementById('btn-add-image');
  const btnRemoveBg = document.getElementById('btn-remove-bg');
  const bgColorInput = document.getElementById('bg-color');
  const bgImageFile = document.getElementById('bg-image-file');
  const btnSetBg = document.getElementById('btn-set-bg');
  const btnClearBg = document.getElementById('btn-clear-bg');

  const textInput = document.getElementById('text-input');
  const btnAddText = document.getElementById('btn-add-text');
  const btnEditText = document.getElementById('btn-edit-text');

  const toolSelect = document.getElementById('tool-select');
  const toolDraw = document.getElementById('tool-draw');
  const toolErase = document.getElementById('tool-erase');

  const brushSize = document.getElementById('brush-size');
  const brushColor = document.getElementById('brush-color');

  const btnUndo = document.getElementById('btn-undo');
  const btnClear = document.getElementById('btn-clear');
  const btnDownload = document.getElementById('btn-download');

  const selInfo = document.getElementById('sel-info');
  const propOpacity = document.getElementById('prop-opacity');
  const propFontsize = document.getElementById('prop-fontsize');
  const propFontcolor = document.getElementById('prop-fontcolor');
  const btnBring = document.getElementById('btn-bring');
  const btnSend = document.getElementById('btn-send');
  const btnDelete = document.getElementById('btn-delete');

  const canvasW = document.getElementById('canvas-w');
  const canvasH = document.getElementById('canvas-h');
  const btnResizeCanvas = document.getElementById('btn-resize-canvas');

  const statusEl = document.getElementById('status');

  // state
  let state = {
    bgColor: '#ffffff',
    bgImage: null, // Image object or null
    objects: [], // layers array: {id,type:'image'|'text'|'drawing', x,y,w,h, scale, rotation, img, text, fontSize, color, opacity}
    selectedId: null,
    tool: 'select',
    drawing: false,
    brushPath: [],
    history: []
  };

  const uniqueId = () => 'id_' + Math.random().toString(36).slice(2,9);

  // drawing layer for brush/eraser (separate canvas)
  const drawLayer = document.createElement('canvas');
  drawLayer.width = canvas.width;
  drawLayer.height = canvas.height;
  const dctx = drawLayer.getContext('2d');

  // helpers
  function pushHistory() {
    try {
      const snap = {
        bgColor: state.bgColor,
        bgImageData: state.bgImage ? state.bgImage.src : null,
        objects: state.objects.map(o => {
          if (o.type === 'image' && o.img && o.img.src) {
            return { ...o, imgSrc: o.img.src };
          }
          return o;
        }),
        drawData: drawLayer.toDataURL()
      };
      state.history.push(snap);
      if (state.history.length > 40) state.history.shift();
      status('Saved snapshot');
    } catch (e) { console.warn('history err',e); }
  }

  function restoreHistory() {
    const snap = state.history.pop();
    if (!snap) return;
    state.bgColor = snap.bgColor;
    if (snap.bgImageData) {
      const img = new Image();
      img.onload = () => { state.bgImage = img; render(); };
      img.src = snap.bgImageData;
    } else {
      state.bgImage = null;
    }
    state.objects = snap.objects.map(o => {
      if (o.type === 'image' && o.imgSrc) {
        const img = new Image();
        img.src = o.imgSrc;
        return { ...o, img };
      }
      return o;
    });
    const img = new Image();
    img.onload = () => {
      dctx.clearRect(0,0,drawLayer.width,drawLayer.height);
      dctx.drawImage(img,0,0);
      render();
    };
    img.src = snap.drawData;
  }

  function status(msg, err=false) {
    statusEl.style.color = err ? 'red':'#333';
    statusEl.textContent = msg || '';
  }

  function clearSelection() {
    state.selectedId = null;
    selInfo.textContent = 'None';
  }

  function getObjectAt(x,y) {
    // iterate top-down
    for (let i = state.objects.length -1; i >=0; i--) {
      const o = state.objects[i];
      if (o.type === 'image' || o.type === 'text' || o.type === 'drawing') {
        if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return o;
      }
    }
    return null;
  }

  function render() {
    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // background
    ctx.fillStyle = state.bgColor || '#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if (state.bgImage) {
      // draw bg image full-canvas keeping aspect fit
      const img = state.bgImage;
      const ratio = Math.max(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
    }

    // draw objects in order
    state.objects.forEach(o => {
      ctx.save();
      ctx.globalAlpha = o.opacity != null ? o.opacity : 1;
      if (o.type === 'image' && o.img) {
        ctx.drawImage(o.img, o.x, o.y, o.w, o.h);
      } else if (o.type === 'text') {
        ctx.font = `${o.fontSize || 28}px sans-serif`;
        ctx.fillStyle = o.color || '#000';
        ctx.fillText(o.text || '', o.x, o.y + (o.fontSize || 28));
      } else if (o.type === 'drawing') {
        // drawing stored as dataURL
        if (o.img) ctx.drawImage(o.img, o.x, o.y, o.w, o.h);
      }
      // if selected, draw border
      if (state.selectedId === o.id) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x - 4, o.y - 4, o.w + 8, o.h + 8);
      }
      ctx.restore();
    });

    // composite drawing layer on top
    ctx.drawImage(drawLayer, 0, 0);
  }

  // add image from File
  function addImageFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = canvas.width * 0.6;
        const scale = Math.min(1, maxW / img.width);
        const w = img.width * scale;
        const h = img.height * scale;
        const obj = {
          id: uniqueId(),
          type: 'image',
          x: (canvas.width - w) / 2,
          y: (canvas.height - h) / 2,
          w, h,
          img,
          opacity: 1
        };
        pushHistory();
        state.objects.push(obj);
        state.selectedId = obj.id;
        selInfo.textContent = `Image (${obj.id})`;
        render();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // add text
  function addText(txt) {
    if (!txt) return;
    const fontSize = parseInt(propFontsize.value || 28,10) || 28;
    const obj = {
      id: uniqueId(),
      type: 'text',
      x: 80,
      y: 80,
      w: txt.length * (fontSize * 0.6),
      h: fontSize + 6,
      text: txt,
      fontSize,
      color: propFontcolor.value || '#000',
      opacity: 1
    };
    pushHistory();
    state.objects.push(obj);
    state.selectedId = obj.id;
    selInfo.textContent = `Text (${obj.id})`;
    render();
  }

  // remove selected object
  function deleteSelected() {
    if (!state.selectedId) return;
    pushHistory();
    state.objects = state.objects.filter(o => o.id !== state.selectedId);
    clearSelection();
    render();
  }

  // bring forward / send back
  function bringForward() {
    const id = state.selectedId; if (!id) return;
    const idx = state.objects.findIndex(o => o.id === id); if (idx < 0) return;
    if (idx === state.objects.length -1) return;
    pushHistory();
    const [o] = state.objects.splice(idx,1);
    state.objects.splice(idx+1,0,o);
    render();
  }
  function sendBack() {
    const id = state.selectedId; if (!id) return;
    const idx = state.objects.findIndex(o => o.id === id); if (idx <= 0) return;
    pushHistory();
    const [o] = state.objects.splice(idx,1);
    state.objects.splice(idx-1,0,o);
    render();
  }

  // canvas mouse events - simple select and drag
  let isPointerDown = false;
  let ptrStart = null;
  let startObj = null;

  canvas.addEventListener('mousedown', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
    isPointerDown = true;
    ptrStart = {x,y};
    if (state.tool === 'draw' || state.tool === 'erase') {
      state.drawing = true;
      dctx.lineJoin = 'round';
      dctx.lineCap = 'round';
      dctx.strokeStyle = state.tool === 'erase' ? '#ffffff' : brushColor.value;
      dctx.globalCompositeOperation = state.tool === 'erase' ? 'destination-out' : 'source-over';
      dctx.lineWidth = parseInt(brushSize.value || 6,10);
      dctx.beginPath();
      dctx.moveTo(x, y);
      pushHistory();
    } else {
      // select top object under pointer
      const o = getObjectAt(x,y);
      if (o) {
        state.selectedId = o.id;
        startObj = { ...o };
        selInfo.textContent = `${o.type} (${o.id})`;
        // compute offset for dragging
        dragOffset = { dx: x - o.x, dy: y - o.y };
        pushHistory();
      } else {
        clearSelection();
        render();
      }
    }
  });

  canvas.addEventListener('mousemove', (ev) => {
    if (!isPointerDown) return;
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height);

    if (state.drawing) {
      dctx.lineTo(x,y);
      dctx.stroke();
      render();
      return;
    }

    if (state.selectedId && state.tool === 'select') {
      // drag selected object
      const oIdx = state.objects.findIndex(o => o.id === state.selectedId);
      if (oIdx >= 0) {
        const o = state.objects[oIdx];
        o.x = x - dragOffset.dx;
        o.y = y - dragOffset.dy;
        render();
      }
    }
  });

  canvas.addEventListener('mouseup', (ev) => {
    isPointerDown = false;
    if (state.drawing) {
      state.drawing = false;
      // store drawing as a 'drawing' object layer if needed
      // For now keep drawing on drawLayer
      pushHistory();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    isPointerDown = false; state.drawing = false;
  });

  // UI bindings
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.id === 'tool-select') state.tool = 'select';
      else if (btn.id === 'tool-draw') state.tool = 'draw';
      else if (btn.id === 'tool-erase') state.tool = 'erase';
    });
  });

  btnAddImage.addEventListener('click', () => addImageFile(fileImage.files[0]));
  fileImage.addEventListener('change', () => {
    // preview not necessary; we'll add on button click
    status('Image ready to add');
  });

  btnAddText.addEventListener('click', () => {
    addText(textInput.value || 'New Text');
  });

  btnEditText.addEventListener('click', () => {
    if (!state.selectedId) { status('Select a text object first', true); return; }
    const o = state.objects.find(o=>o.id===state.selectedId);
    if (!o || o.type !== 'text') { status('Selected is not text', true); return; }
    pushHistory();
    o.text = textInput.value || o.text;
    o.fontSize = parseInt(propFontsize.value || o.fontSize || 28,10);
    o.color = propFontcolor.value || o.color;
    o.w = o.text.length * (o.fontSize * 0.6);
    o.h = o.fontSize + 6;
    render();
  });

  btnDelete.addEventListener('click', deleteSelected);
  btnBring.addEventListener('click', bringForward);
  btnSend.addEventListener('click', sendBack);

  propOpacity.addEventListener('input', () => {
    if (!state.selectedId) return;
    const o = state.objects.find(o=>o.id===state.selectedId);
    if (!o) return;
    pushHistory();
    o.opacity = parseFloat(propOpacity.value);
    render();
  });

  propFontsize.addEventListener('change', () => {
    if (!state.selectedId) return;
    const o = state.objects.find(o=>o.id===state.selectedId);
    if (!o || o.type !== 'text') return;
    pushHistory();
    o.fontSize = parseInt(propFontsize.value || o.fontSize, 10);
    o.h = o.fontSize + 6;
    o.w = o.text.length * (o.fontSize * 0.6);
    render();
  });

  propFontcolor.addEventListener('change', () => {
    if (!state.selectedId) return;
    const o = state.objects.find(o=>o.id===state.selectedId);
    if (!o || o.type !== 'text') return;
    pushHistory();
    o.color = propFontcolor.value;
    render();
  });

  btnUndo.addEventListener('click', () => {
    restoreHistory();
  });

  btnClear.addEventListener('click', () => {
    pushHistory();
    state.objects = [];
    dctx.clearRect(0,0,drawLayer.width,drawLayer.height);
    state.bgImage = null;
    render();
  });

  btnDownload.addEventListener('click', () => {
    // render final to temp canvas with bg and all layers combined
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const octx = out.getContext('2d');
    // bg
    octx.fillStyle = state.bgColor || '#fff';
    octx.fillRect(0,0,out.width,out.height);
    if (state.bgImage) {
      const img = state.bgImage;
      const ratio = Math.max(out.width / img.width, out.height / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = (out.width - w) / 2;
      const y = (out.height - h) / 2;
      octx.drawImage(img, x, y, w, h);
    }
    // objects
    state.objects.forEach(o => {
      octx.globalAlpha = o.opacity != null ? o.opacity : 1;
      if (o.type === 'image' && o.img) {
        octx.drawImage(o.img, o.x, o.y, o.w, o.h);
      } else if (o.type === 'text') {
        octx.font = `${o.fontSize || 28}px sans-serif`;
        octx.fillStyle = o.color || '#000';
        octx.fillText(o.text || '', o.x, o.y + (o.fontSize || 28));
      } else if (o.type === 'drawing' && o.img) {
        octx.drawImage(o.img, o.x, o.y, o.w, o.h);
      }
    });
    // draw layer
    octx.drawImage(drawLayer, 0, 0);

    const dataUrl = out.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'sticker.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // background controls
  bgColorInput.addEventListener('input', () => {
    pushHistory();
    state.bgColor = bgColorInput.value;
    render();
  });

  btnSetBg.addEventListener('click', () => {
    const f = bgImageFile.files[0];
    if (!f) { status('Choose background image first', true); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        pushHistory();
        state.bgImage = img;
        render();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  });

  btnClearBg.addEventListener('click', () => {
    pushHistory();
    state.bgImage = null;
    render();
  });

  // remove-bg for selected image: sends original file to server /remove-bg
  btnRemoveBg.addEventListener('click', async () => {
    if (!state.selectedId) { status('Select an image object to remove BG', true); return; }
    const o = state.objects.find(o=>o.id===state.selectedId);
    if (!o || o.type !== 'image' || !o.img || !o.img.src.startsWith('data:')) {
      status('Selected object is not an embeddable data-image', true);
      return;
    }

    // Convert dataURL to blob
    try {
      status('Removing background...'); 
      const blob = await (await fetch(o.img.src)).blob();
      const form = new FormData();
      form.append('image', blob, 'upload.png');

      const resp = await fetch('/remove-bg', { method: 'POST', body: form });
      const json = await resp.json();
      if (!json.success) {
        status('remove-bg failed: ' + (json.message || 'error'), true);
        console.error(json);
        return;
      }
      const newData = json.image;
      const newImg = new Image();
      newImg.onload = () => {
        pushHistory();
        o.img = newImg;
        // adjust size to same w/h or fit
        o.w = newImg.width > canvas.width ? canvas.width * 0.6 : o.w;
        o.h = (o.w / newImg.width) * newImg.height;
        render();
        status('Background removed');
      };
      newImg.src = newData;
    } catch (err) {
      console.error(err);
      status('Error removing background: ' + err.message, true);
    }
  });

  // resize canvas
  btnResizeCanvas.addEventListener('click', () => {
    const w = parseInt(canvasW.value || canvas.width, 10);
    const h = parseInt(canvasH.value || canvas.height, 10);
    if (w <= 0 || h <= 0) { status('Invalid canvas size', true); return; }
    pushHistory();
    // scale existing content to new size
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = state.bgColor || '#fff';
    tctx.fillRect(0,0,w,h);
    tctx.drawImage(canvas, 0, 0, w, h);
    // apply
    canvas.width = w; canvas.height = h;
    drawLayer.width = w; drawLayer.height = h;
    // redraw from objects without scaling for simplicity, user can adjust
    render();
  });

  // initial render
  function init() {
    canvas.width = parseInt(canvasW.value,10) || 1000;
    canvas.height = parseInt(canvasH.value,10) || 700;
    drawLayer.width = canvas.width;
    drawLayer.height = canvas.height;
    render();
    status('Ready');
  }

  init();

  // utility: find object by id
  function getObjectIndex(id) {
    return state.objects.findIndex(o => o.id === id);
  }

  // Simple hit test to support selection by clicking objects
  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
    const o = getObjectAt(x,y);
    if (o) {
      state.selectedId = o.id;
      selInfo.textContent = `${o.type} (${o.id})`;
      // populate properties if text
      if (o.type === 'text') {
        propFontsize.value = o.fontSize || 28;
        propFontcolor.value = o.color || '#000';
      }
      if (o.opacity != null) propOpacity.value = o.opacity;
      render();
    } else {
      clearSelection();
      render();
    }
  });

  // helper: load image by URL and add as object (used if needed)
  function addImageFromUrl(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxW = canvas.width * 0.6;
      const scale = Math.min(1, maxW / img.width);
      const w = img.width * scale;
      const h = img.height * scale;
      const obj = { id: uniqueId(), type:'image', x:(canvas.width - w)/2, y:(canvas.height - h)/2, w,h, img, opacity:1 };
      pushHistory();
      state.objects.push(obj);
      state.selectedId = obj.id;
      render();
    };
    img.src = url;
  }

  // expose addImageFile for UI
  window.addImageFile = addImageFile;

  // good UX: allow drop into canvas
  canvas.addEventListener('dragover', (e) => { e.preventDefault(); });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) addImageFile(f);
  });

})();
