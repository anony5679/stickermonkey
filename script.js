;(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const uploadInput = document.getElementById("upload-input")
    if (uploadInput) {
      uploadInput.addEventListener("change", async (e) => {
        const file = uploadInput.files && uploadInput.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
          try {
            // Keep the uploaded image in sessionStorage for the editor to use
            sessionStorage.setItem("editor:image", String(reader.result))
            // Redirect to editor
            window.location.href = "./editor.html"
          } catch (err) {
            console.error("[v0] Failed to store image for editor:", err)
          }
        }
        reader.readAsDataURL(file)
      })
    }
  })
})()
;(() => {
  const TAU = Math.PI * 2

  function initEditor() {
    const canvas = document.getElementById("editor-canvas")
    const root = document.getElementById("editor-root")
    if (!canvas || !root) return // not on editor page

    const ctx = canvas.getContext("2d")
    const state = {
      bgColor: "#ffffff",
      items: [], // {type: 'image'|'text'|'rect'|'circle'|'star', x,y,w,h, rotation, fill, text, font, src, imageObj}
      selectedId: null,
      history: [],
      redo: [],
    }

    // Utilities
    const dpr = window.devicePixelRatio || 1
    function setupCanvasSize() {
      // Scale canvas for crisp rendering
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(((rect.width * 2) / 3) * dpr) // 3:2 aspect by default
      canvas.style.height = Math.round(canvas.height / dpr) + "px"
      canvas.style.width = Math.round(canvas.width / dpr) + "px"
      draw()
    }

    function pushHistory() {
      state.history.push(
        JSON.stringify({
          bgColor: state.bgColor,
          items: state.items.map((i) => ({ ...i, imageObj: undefined })),
        }),
      )
      if (state.history.length > 100) state.history.shift()
      state.redo = []
    }

    function undo() {
      if (!state.history.length) return
      const last = state.history.pop()
      state.redo.push(
        JSON.stringify({
          bgColor: state.bgColor,
          items: state.items.map((i) => ({ ...i, imageObj: undefined })),
        }),
      )
      applySnapshot(JSON.parse(last))
    }
    function redo() {
      if (!state.redo.length) return
      const snap = JSON.parse(state.redo.pop())
      state.history.push(
        JSON.stringify({
          bgColor: state.bgColor,
          items: state.items.map((i) => ({ ...i, imageObj: undefined })),
        }),
      )
      applySnapshot(snap)
    }
    function applySnapshot(snap) {
      state.bgColor = snap.bgColor
      state.items = snap.items.map((i) => ({ ...i }))
      // Rehydrate images if needed
      state.items.forEach((i) => {
        if (i.type === "image" && i.src) {
          const im = new Image()
          im.crossOrigin = "anonymous"
          im.onload = draw
          im.src = i.src
          i.imageObj = im
        }
      })
      draw()
    }

    function addItem(item) {
      const id = Date.now() + Math.random()
      state.items.push({ ...item, id })
      state.selectedId = id
      pushHistory()
      draw()
    }

    function getSelected() {
      return state.items.find((i) => i.id === state.selectedId) || null
    }

    function draw() {
      // Clear
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Background
      ctx.fillStyle = state.bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw all
      state.items.forEach((item) => {
        ctx.save()
        ctx.translate(item.x, item.y)
        ctx.rotate(item.rotation || 0)
        // Draw item
        if (item.type === "image" && item.imageObj) {
          ctx.drawImage(item.imageObj, -item.w / 2, -item.h / 2, item.w, item.h)
        } else if (item.type === "rect") {
          ctx.fillStyle = item.fill || "#000"
          ctx.fillRect(-item.w / 2, -item.h / 2, item.w, item.h)
        } else if (item.type === "circle") {
          ctx.fillStyle = item.fill || "#000"
          ctx.beginPath()
          ctx.ellipse(0, 0, item.w / 2, item.h / 2, 0, 0, TAU)
          ctx.fill()
        } else if (item.type === "star") {
          ctx.fillStyle = item.fill || "#000"
          drawStar(ctx, 0, 0, 5, Math.min(item.w, item.h) / 2, Math.min(item.w, item.h) / 4)
          ctx.fill()
        } else if (item.type === "text") {
          ctx.fillStyle = item.fill || "#111827"
          ctx.font = `${item.size || 28}px ${item.font || "Poppins, Arial, sans-serif"}`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          wrapText(ctx, item.text || "Double‑click to edit", 0, 0, item.w, item.size || 28 * dpr)
        }
        ctx.restore()
      })

      // Selection
      const sel = getSelected()
      if (sel) {
        drawSelection(sel)
      }
      ctx.restore()
    }

    function drawSelection(item) {
      ctx.save()
      ctx.translate(item.x, item.y)
      ctx.rotate(item.rotation || 0)
      ctx.strokeStyle = "#2563eb"
      ctx.lineWidth = Math.max(1, 2 * dpr)
      ctx.setLineDash([6 * dpr, 6 * dpr])
      ctx.strokeRect(-item.w / 2, -item.h / 2, item.w, item.h)
      ctx.setLineDash([])

      // Handles: 4 corners for resize, one top for rotate
      const handles = getHandles(item)
      ctx.fillStyle = "#2563eb"
      handles.forEach((h) => {
        ctx.beginPath()
        ctx.rect(h.x - 6 * dpr, h.y - 6 * dpr, 12 * dpr, 12 * dpr)
        ctx.fill()
      })
      // rotation handle (top-center)
      ctx.beginPath()
      ctx.arc(0, -item.h / 2 - 24 * dpr, 6 * dpr, 0, TAU)
      ctx.fill()
      ctx.restore()
    }

    function getHandles(item) {
      // Return handle positions in item-local coords
      return [
        { name: "tl", x: -item.w / 2, y: -item.h / 2 },
        { name: "tr", x: item.w / 2, y: -item.h / 2 },
        { name: "bl", x: -item.w / 2, y: item.h / 2 },
        { name: "br", x: item.w / 2, y: item.h / 2 },
      ]
    }

    function localPoint(item, gx, gy) {
      // convert global canvas coords (gx,gy) to item-local coordinates
      const cos = Math.cos(item.rotation || 0)
      const sin = Math.sin(item.rotation || 0)
      const dx = gx - item.x
      const dy = gy - item.y
      return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos }
    }

    function globalPoint(item, lx, ly) {
      const cos = Math.cos(item.rotation || 0)
      const sin = Math.sin(item.rotation || 0)
      return { x: item.x + lx * cos - ly * sin, y: item.y + lx * sin + ly * cos }
    }

    function hitTest(gx, gy) {
      // return topmost item under point
      for (let i = state.items.length - 1; i >= 0; i--) {
        const it = state.items[i]
        const p = localPoint(it, gx, gy)
        if (Math.abs(p.x) <= it.w / 2 && Math.abs(p.y) <= it.h / 2) {
          return it
        }
      }
      return null
    }

    function hitHandle(item, gx, gy) {
      // rotation handle (circle)
      const rotG = globalPoint(item, 0, -item.h / 2 - 24 * dpr)
      const dist2 = (gx - rotG.x) ** 2 + (gy - rotG.y) ** 2
      if (dist2 <= (8 * dpr) ** 2) return { type: "rotate" }

      // resize handles
      const handles = getHandles(item)
      for (const h of handles) {
        const g = globalPoint(item, h.x, h.y)
        if (Math.abs(gx - g.x) <= 8 * dpr && Math.abs(gy - g.y) <= 8 * dpr) {
          return { type: "resize", corner: h.name }
        }
      }
      return null
    }

    // Mouse interactions
    const pointer = { down: false, x: 0, y: 0, lastX: 0, lastY: 0, mode: null, corner: null, start: {}, target: null }
    function canvasPoint(evt) {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (evt.clientX - rect.left) * dpr,
        y: (evt.clientY - rect.top) * dpr,
      }
    }

    canvas.addEventListener("mousedown", (e) => {
      const p = canvasPoint(e)
      pointer.down = true
      pointer.x = pointer.lastX = p.x
      pointer.y = pointer.lastY = p.y

      // check handles first
      if (state.selectedId) {
        const sel = getSelected()
        if (sel) {
          const handle = hitHandle(sel, p.x, p.y)
          if (handle) {
            pointer.mode = handle.type
            pointer.corner = handle.corner || null
            pointer.target = sel
            pointer.start = { ...sel, mx: p.x, my: p.y }
            return
          }
        }
      }
      // select or drag
      const hit = hitTest(p.x, p.y)
      if (hit) {
        state.selectedId = hit.id
        pointer.mode = "drag"
        pointer.target = hit
        pointer.start = { x: hit.x, y: hit.y, mx: p.x, my: p.y }
      } else {
        state.selectedId = null
      }
      draw()
    })

    window.addEventListener("mousemove", (e) => {
      if (!pointer.down || !pointer.target) return
      const p = canvasPoint(e)
      const dx = p.x - pointer.start.mx
      const dy = p.y - pointer.start.my
      const t = pointer.target

      if (pointer.mode === "drag") {
        t.x = pointer.start.x + dx
        t.y = pointer.start.y + dy
        draw()
      } else if (pointer.mode === "resize") {
        // convert delta into local space of the item
        const lp1 = localPoint(t, pointer.start.mx, pointer.start.my)
        const lp2 = localPoint(t, p.x, p.y)
        const ddx = lp2.x - lp1.x
        const ddy = lp2.y - lp1.y

        if (pointer.corner === "tl") {
          t.w -= ddx
          t.h -= ddy
          t.x += ddx / 2
          t.y += ddy / 2
        }
        if (pointer.corner === "tr") {
          t.w += ddx
          t.h -= ddy
          t.x += ddx / 2
          t.y += ddy / 2
        }
        if (pointer.corner === "bl") {
          t.w -= ddx
          t.h += ddy
          t.x += ddx / 2
          t.y += ddy / 2
        }
        if (pointer.corner === "br") {
          t.w += ddx
          t.h += ddy
          t.x += ddx / 2
          t.y += ddy / 2
        }

        // clamp
        t.w = Math.max(20 * dpr, Math.min(t.w, canvas.width))
        t.h = Math.max(20 * dpr, Math.min(t.h, canvas.height))
        draw()
      } else if (pointer.mode === "rotate") {
        const ang = Math.atan2(p.y - t.y, p.x - t.x) - Math.atan2(-t.h / 2, 0)
        t.rotation = ang
        draw()
      }
    })

    window.addEventListener("mouseup", () => {
      if (pointer.down && pointer.target) {
        pushHistory()
      }
      pointer.down = false
      pointer.mode = null
      pointer.corner = null
      pointer.target = null
    })

    // Double click to edit text
    canvas.addEventListener("dblclick", (e) => {
      const p = canvasPoint(e)
      const hit = hitTest(p.x, p.y)
      if (hit && hit.type === "text") {
        const next = prompt("Edit text:", hit.text || "")
        if (next !== null) {
          hit.text = next
          pushHistory()
          draw()
        }
      }
    })

    // Toolbar actions
    document.getElementById("tool-undo")?.addEventListener("click", undo)
    document.getElementById("tool-redo")?.addEventListener("click", redo)

    document.getElementById("export-png")?.addEventListener("click", () => {
      const url = canvas.toDataURL("image/png")
      download(url, "sticker.png")
    })
    document.getElementById("export-jpg")?.addEventListener("click", () => {
      const url = canvas.toDataURL("image/jpeg", 0.92)
      download(url, "sticker.jpg")
    })

    function download(url, name) {
      const a = document.createElement("a")
      a.href = url
      a.download = name
      a.click()
    }

    // Background color
    document.getElementById("background-color")?.addEventListener("input", (e) => {
      const val = e.target.value
      state.bgColor = val
      pushHistory()
      draw()
    })

    // Add Text
    document.getElementById("tool-text")?.addEventListener("click", () => {
      const size = Number.parseInt(document.getElementById("font-size")?.value || "28", 10)
      const fill = document.getElementById("text-color")?.value || "#111827"
      addItem({
        type: "text",
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: 400 * dpr,
        h: size * 2 * dpr,
        rotation: 0,
        text: "Your text",
        size: size * dpr,
        fill,
        font: "Poppins, Arial, sans-serif",
      })
    })

    // Shapes
    document.getElementById("shape-rect")?.addEventListener("click", () => {
      const fill = document.getElementById("shape-color")?.value || "#000000"
      addItem({
        type: "rect",
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: 300 * dpr,
        h: 180 * dpr,
        rotation: 0,
        fill,
      })
    })
    document.getElementById("shape-circle")?.addEventListener("click", () => {
      const fill = document.getElementById("shape-color")?.value || "#000000"
      addItem({
        type: "circle",
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: 240 * dpr,
        h: 240 * dpr,
        rotation: 0,
        fill,
      })
    })
    document.getElementById("shape-star")?.addEventListener("click", () => {
      const fill = document.getElementById("shape-color")?.value || "#000000"
      addItem({
        type: "star",
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: 260 * dpr,
        h: 260 * dpr,
        rotation: 0,
        fill,
      })
    })

    // Stickers
    document.querySelectorAll(".sticker-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const src = btn.getAttribute("data-src")
        if (!src) return
        const im = new Image()
        im.crossOrigin = "anonymous"
        im.onload = () => {
          addItem({
            type: "image",
            x: canvas.width / 2,
            y: canvas.height / 2,
            w: Math.min(360 * dpr, im.width * dpr),
            h: Math.min(360 * dpr, im.height * dpr),
            rotation: 0,
            src,
            imageObj: im,
          })
        }
        im.src = src
      })
    })

    // Upload another image from toolbar
    document.getElementById("editor-upload")?.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const src = String(reader.result)
        const im = new Image()
        im.crossOrigin = "anonymous"
        im.onload = () => {
          addItem({
            type: "image",
            x: canvas.width / 2,
            y: canvas.height / 2,
            w: Math.min(600 * dpr, im.width * dpr),
            h: Math.min(600 * dpr, im.height * dpr),
            rotation: 0,
            src,
            imageObj: im,
          })
        }
        im.src = src
      }
      reader.readAsDataURL(file)
    })

    // Helpers
    function drawStar(ctx, x, y, spikes, outerRadius, innerRadius) {
      let rot = (Math.PI / 2) * 3
      const cx = x,
        cy = y
      const step = Math.PI / spikes

      ctx.beginPath()
      ctx.moveTo(cx, cy - outerRadius)
      for (let i = 0; i < spikes; i++) {
        let x1 = cx + Math.cos(rot) * outerRadius
        let y1 = cy + Math.sin(rot) * outerRadius
        ctx.lineTo(x1, y1)
        rot += step

        x1 = cx + Math.cos(rot) * innerRadius
        y1 = cy + Math.sin(rot) * innerRadius
        ctx.lineTo(x1, y1)
        rot += step
      }
      ctx.lineTo(cx, cy - outerRadius)
      ctx.closePath()
    }

    function wrapText(context, text, x, y, maxWidth, lineHeight) {
      const words = (text || "").split(" ")
      let line = ""
      let yy = y - lineHeight // start above center to roughly center multiple lines
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " "
        const metrics = context.measureText(testLine)
        const testWidth = metrics.width
        if (testWidth > maxWidth && n > 0) {
          context.fillText(line, x, yy)
          line = words[n] + " "
          yy += lineHeight
        } else {
          line = testLine
        }
      }
      context.fillText(line, x, yy)
    }

    // Initial load from material page, if present
    const initial = sessionStorage.getItem("editor:image")
    if (initial) {
      const im = new Image()
      im.crossOrigin = "anonymous"
      im.onload = () => {
        state.items = [
          {
            id: Date.now(),
            type: "image",
            x: canvas.width / 2,
            y: canvas.height / 2,
            w: Math.min(700 * dpr, im.width * dpr),
            h: Math.min(700 * dpr, im.height * dpr),
            rotation: 0,
            src: initial,
            imageObj: im,
          },
        ]
        pushHistory()
        draw()
        sessionStorage.removeItem("editor:image")
      }
      im.src = initial
    } else {
      draw()
    }

    window.addEventListener("resize", setupCanvasSize, { passive: true })
    setupCanvasSize()
  }

  // Small dataset to restore materials UI
  const MATERIALS = [
    {
      slug: "holographic",
      name: "Holographic Vinyl",
      sub: "Rainbow sheen with strong durability",
      desc: "Durable vinyl with a holographic finish for eye‑catching designs.",
      features: ["Waterproof", "UV resistant", "Strong adhesive"],
      images: ["https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/06/08/4d0ae46e9e164daa9171d70e51cd46c7acaa2419.png", "./assets/bottle-stickers.jpg", "./assets/labels.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$9", pcs50: "$39", pcs100: "$69" },
        { size: "3x3 in", pcs10: "$12", pcs50: "$59", pcs100: "$99" },
      ],
      reviews: [
        {
          title: "Great colors",
          text: "The holographic effect looks amazing!",
        
        },
        {TITLE : "GREAT WORK",
          TEXT : "THIS STICKERS ARE LOOKS AMAZING"
        }    
    ],
    },
    {
      slug: "clear",
      name: "Clear Vinyl",
      sub: "Crisp designs on transparent film",
      desc: "Clear material ideal for windows and products where the background should show through.",
      features: ["Transparent base", "Weatherproof", "Smooth finish"],
      images: ["https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/06/08/4d0ae46e9e164daa9171d70e51cd46c7acaa2419.png", "./assets/sample-pack.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$8", pcs50: "$34", pcs100: "$59" },
        { size: "3x3 in", pcs10: "$10", pcs50: "$49", pcs100: "$85" },
      ],
      reviews: [
        { title: "Perfect for bottles", text: "Looks premium on our product line." },
      ],
    },
    {
      slug: "matte",
      name: "Matte Vinyl",
      sub: "Soft, glare‑free look",
      desc: "Non‑glossy finish for an elegant, glare‑free appearance.",
      features: ["Matte finish", "Durable", "Scratch resistant"],
      images: ["https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/e4ae8c4973e6e530cedcce836d8366638ca4c6d3.png", "./assets/custom-sticker-pack.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$7", pcs50: "$29", pcs100: "$49" },
        { size: "3x3 in", pcs10: "$9", pcs50: "$44", pcs100: "$79" },
      ],
      reviews: [{ title: "Premium feel", text: "The matte finish feels great.", img: "./assets/sample-pack.jpg" }],
    },
    {
      slug: "glossy",
      name: "Glossy Vinyl",
      sub: "Shiny, vibrant finish",
      desc: "High‑gloss laminate that makes colors pop and adds protection.",
      features: ["High‑gloss", "Scratch resistant", "Waterproof"],
      images: ["https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/573a155499c9496b21c3f404bffb6499ae99462e.png", "./assets/sample-pack.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$8", pcs50: "$33", pcs100: "$57" },
        { size: "3x3 in", pcs10: "$11", pcs50: "$52", pcs100: "$89" },
      ],
      reviews: [{ title: "So shiny!", text: "Colors really pop with glossy.", img: "./assets/bottle-stickers.jpg" }],
    },
    {
      slug: "kraft",
      name: "Kraft Paper",
      sub: "Natural, eco‑friendly look",
      desc: "Textured kraft paper for warm, organic branding.",
      features: ["Uncoated", "Writable", "Eco‑friendly"],
      images: ["./assets/sample-pack.jpg", "./assets/labels.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$6", pcs50: "$27", pcs100: "$45" },
        { size: "3x3 in", pcs10: "$8", pcs50: "$39", pcs100: "$69" },
      ],
      reviews: [{ title: "Great texture", text: "Perfect for our handmade vibe.", img: "./assets/labels.jpg" }],
    },
    {
      slug: "silver-foil",
      name: "Silver Foil",
      sub: "Metallic shine in silver",
      desc: "Metallic foil effect for premium labels and stickers.",
      features: ["Metallic effect", "Durable", "Water resistant"],
      images: ["https://th.bing.com/th/id/OIP.R22ixxIcOoVoUiwCnTqS2QHaJh?w=153&h=197&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3", "./assets/custom-sticker-pack.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$10", pcs50: "$44", pcs100: "$75" },
        { size: "3x3 in", pcs10: "$13", pcs50: "$64", pcs100: "$109" },
      ],
      reviews: [{ title: "Premium finish", text: "Looks high‑end on packaging.", img: "./assets/sample-pack.jpg" }],
    },
    {
      slug: "gold-foil",
      name: "Gold Foil",
      sub: "Warm metallic gold",
      desc: "Elegant gold foil for luxury branding and gifts.",
      features: ["Gold metallic", "Scratch resistant", "UV stable"],
      images: ["https://th.bing.com/th/id/OIP.cQn1Y4RaDoEPA1vpFKifDgHaJ4?w=139&h=185&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3","./assets/bottle-stickers.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$11", pcs50: "$46", pcs100: "$79" },
        { size: "3x3 in", pcs10: "$14", pcs50: "$67", pcs100: "$115" },
      ],
      reviews: [
        { title: "Luxury look", text: "Adds a classy touch to our boxes.", img: "./assets/custom-sticker-pack.jpg" },
      ],
    },
    {
      slug: "removable",
      name: "Removable Vinyl",
      sub: "Easy to remove, no residue",
      desc: "Great for temporary promos and indoor use.",
      features: ["Removable adhesive", "No residue", "Indoor use"],
      images: ["https://th.bing.com/th/id/OIP.k64qgelBpftuZZuI5XMEHwHaHa?w=171&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3", "./assets/labels.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$7", pcs50: "$30", pcs100: "$49" },
        { size: "3x3 in", pcs10: "$9", pcs50: "$45", pcs100: "$79" },
      ],
      reviews: [{ title: "Easy cleanup", text: "Came off cleanly after our event.", img: "./assets/sample-pack.jpg" }],
    },
    {
      slug: "transparent",
      name: "Transparent Vinyl",
      sub: "See-through with vibrant print",
      desc: "Ultra-clear vinyl that showcases your design while letting the background shine through.",
      features: ["Crystal clear", "Weatherproof", "Strong adhesive"],
      images: ["https://th.bing.com/th/id/OIP.yjbrNdBktiy6PF0-_QioLgHaHa?w=192&h=192&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3", "./assets/custom-sticker-pack.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$9", pcs50: "$37", pcs100: "$64" },
        { size: "3x3 in", pcs10: "$11", pcs50: "$54", pcs100: "$92" },
      ],
      reviews: [
        { title: "Crystal clear", text: "Perfect transparency for our glass products.", img: "./assets/labels.jpg" },
      ],
    },
    {
      slug: "white-vinyl",
      name: "White Vinyl",
      sub: "Classic white base",
      desc: "Standard white vinyl perfect for vibrant, full-color designs.",
      features: ["Opaque white", "Waterproof", "Long-lasting"],
      images: ["https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/c5e0f009dbf3aec33b2e8d0caac5ebcd1a10348f.png", "./assets/labels.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$6", pcs50: "$26", pcs100: "$44" },
        { size: "3x3 in", pcs10: "$8", pcs50: "$38", pcs100: "$66" },
      ],
      reviews: [
        {
          title: "Great quality",
          text: "Perfect white base for our colorful designs.",
          img: "./assets/custom-sticker-pack.jpg",
        },
      ],
    },
    {
      slug: "brushed-metal",
      name: "Brushed Metal",
      sub: "Industrial metallic texture",
      desc: "Brushed aluminum look for a modern, industrial aesthetic.",
      features: ["Metallic texture", "Durable", "Premium look"],
      images: ["https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/573a155499c9496b21c3f404bffb6499ae99462e.png", "./assets/bottle-stickers.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$12", pcs50: "$49", pcs100: "$84" },
        { size: "3x3 in", pcs10: "$15", pcs50: "$69", pcs100: "$119" },
      ],
      reviews: [{ title: "Industrial chic", text: "Perfect for our tech brand.", img: "./assets/sample-pack.jpg" }],
    },
    {
      slug: "neon",
      name: "Neon Vinyl",
      sub: "Ultra-bright fluorescent colors",
      desc: "Eye-catching neon colors that stand out in any environment.",
      features: ["Fluorescent", "High visibility", "Weatherproof"],
      images: ["https://th.bing.com/th/id/OIP.PLLl1Vkn1XSC9fHSF39JowHaHY?w=198&h=197&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3", "./assets/sample-pack.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$10", pcs50: "$42", pcs100: "$72" },
        { size: "3x3 in", pcs10: "$13", pcs50: "$61", pcs100: "$104" },
      ],
      reviews: [{ title: "Super bright", text: "These really grab attention!", img: "./assets/bottle-stickers.jpg" }],
    },
    {
      slug: "textured",
      name: "Textured Vinyl",
      sub: "Tactile surface finish",
      desc: "Unique textured surface adds depth and premium feel to your stickers.",
      features: ["Textured surface", "Premium feel", "Durable"],
      images: ["https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/06/08/4d0ae46e9e164daa9171d70e51cd46c7acaa2419.png", "./assets/sample-pack.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$11", pcs50: "$45", pcs100: "$77" },
        { size: "3x3 in", pcs10: "$14", pcs50: "$65", pcs100: "$111" },
      ],
      reviews: [
        { title: "Unique texture", text: "Customers love the tactile feel.", img: "./assets/custom-sticker-pack.jpg" },
      ],
    },
    {
      slug: "eco-paper",
      name: "Eco Paper",
      sub: "100% recycled material",
      desc: "Environmentally friendly paper stickers made from recycled materials.",
      features: ["100% recycled", "Biodegradable", "Eco-friendly"],
      images: ["https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/08/23/46dac2bd418951b1412d4225cbdaad579aed03e4.png", "./assets/labels.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$7", pcs50: "$31", pcs100: "$52" },
        { size: "3x3 in", pcs10: "$9", pcs50: "$43", pcs100: "$74" },
      ],
      reviews: [
        { title: "Eco-conscious", text: "Great for our sustainable brand.", img: "./assets/bottle-stickers.jpg" },
      ],
    },
    {
      slug: "chalkboard",
      name: "Chalkboard Vinyl",
      sub: "Writable matte black surface",
      desc: "Matte black vinyl that can be written on with chalk for customizable labels.",
      features: ["Writable surface", "Reusable", "Matte black"],
      images: ["https://d6ce0no7ktiq.cloudfront.net/images/attachment/2024/10/16/3980001d8c15a7ed2b727613c425f8290de317cd.png", "./assets/custom-sticker-pack.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$9", pcs50: "$38", pcs100: "$65" },
        { size: "3x3 in", pcs10: "$12", pcs50: "$56", pcs100: "$96" },
      ],
      reviews: [
        { title: "Love the versatility", text: "Perfect for our kitchen jars.", img: "./assets/sample-pack.jpg" },
      ],
    },
    {
      slug: "glitter",
      name: "Glitter Vinyl",
      sub: "Sparkly, eye-catching finish",
      desc: "Glitter-infused vinyl that adds sparkle and glamour to any design.",
      features: ["Glitter finish", "Durable", "Fade resistant"],
      images: ["https://d6ce0no7ktiq.cloudfront.net/images/attachment/2023/03/09/8d48777356c014861f8e174949f2a382778c0a7e.png", "./assets/bottle-stickers.jpg"],
      sizes: [
        { size: "2x2 in", pcs10: "$11", pcs50: "$47", pcs100: "$81" },
        { size: "3x3 in", pcs10: "$14", pcs50: "$68", pcs100: "$117" },
      ],
      reviews: [{ title: "So sparkly!", text: "Perfect for our party favors.", img: "./assets/labels.jpg" }],
    },
  ]

  function $(sel, root = document) {
    return root.querySelector(sel)
  }
  function $all(sel, root = document) {
    return Array.from(root.querySelectorAll(sel))
  }
  function byId(id) {
    return document.getElementById(id)
  }
  function getMaterialBySlug(slug) {
    return MATERIALS.find((m) => m.slug === slug) || null
  }
  function getSlugFromURL() {
    try {
      const p = new URLSearchParams(window.location.search)
      return p.get("material")
    } catch {
      return null
    }
  }

  function renderYear() {
    const year = byId("year")
    if (year) year.textContent = String(new Date().getFullYear())
  }

  // Home page: render the horizontal materials list
  function renderMaterialsListIfPresent() {
    const list = $(".materials-scroll")
    if (!list) return
    list.innerHTML = ""
    MATERIALS.forEach((m) => {
      const card = document.createElement("article")
      card.className = "material-card"
      card.setAttribute("role", "listitem")
      card.innerHTML = `
        <a class="material-link" href="./material.html?material=${m.slug}" aria-label="View ${m.name}">
          <div class="material-thumb">
            <img src="${m.images[0] || "./assets/sample-pack.jpg"}" alt="${m.name}" />
          </div>
          <div class="material-meta">
            <h3 class="material-name">${m.name}</h3>
            <p class="material-sub">${m.sub}</p>
          </div>
        </a>
      `
      list.appendChild(card)
    })
  }

  // Material detail page: populate content
  function populateMaterialDetailIfPresent() {
    const titleEl = byId("material-name")
    if (!titleEl) return // Not on material.html

    const slug = getSlugFromURL()
    const data = slug ? getMaterialBySlug(slug) : null

    // Fallback when no/unknown slug
    const mat = data || {
      name: "Material",
      sub: "Explore features, pricing, and examples.",
      desc: "High-quality material suited to your use case.",
      features: [],
      images: ["./assets/sample-pack.jpg"],
      sizes: [],
      reviews: [],
    }

    // Set page heading/sub
    titleEl.textContent = mat.name
    const subEl = byId("material-sub")
    if (subEl) subEl.textContent = mat.sub
    const descEl = byId("material-desc")
    if (descEl) descEl.textContent = mat.desc

    // Update document title
    const pageTitle = byId("page-title")
    if (pageTitle) pageTitle.textContent = `${mat.name} - Clone`

    // Features
    const featList = byId("material-features")
    if (featList) {
      featList.innerHTML = ""
      mat.features.forEach((f) => {
        const li = document.createElement("li")
        li.textContent = f
        featList.appendChild(li)
      })
    }

    // Carousel
    const viewport = byId("carousel-viewport")
    const prevBtn = byId("carousel-prev")
    const nextBtn = byId("carousel-next")
    let current = 0
    function renderCarousel() {
      if (!viewport) return
      viewport.innerHTML = ""
      const img = document.createElement("img")
      img.alt = `${mat.name} example ${current + 1}`
      img.src = mat.images[current] || "./assets/sample-pack.jpg"
      viewport.appendChild(img)
    }
    if (viewport && prevBtn && nextBtn) {
      renderCarousel()
      prevBtn.addEventListener("click", () => {
        current = (current - 1 + mat.images.length) % mat.images.length
        renderCarousel()
      })
      nextBtn.addEventListener("click", () => {
        current = (current + 1) % mat.images.length
        renderCarousel()
      })
    }

    // Pricing table
    const table = byId("pricing-table")
    if (table && mat.sizes?.length) {
      const tbody = table.querySelector("tbody")
      if (tbody) {
        tbody.innerHTML = ""
        mat.sizes.forEach((row) => {
          const tr = document.createElement("tr")
          tr.innerHTML = `
            <td>${row.size}</td>
            <td>${row.pcs10}</td>
            <td>${row.pcs50}</td>
            <td>${row.pcs100}</td>
          `
          tbody.appendChild(tr)
        })
      }
    }

    // Reviews grid
    const reviewsGrid = byId("reviews-grid")
    if (reviewsGrid) {
      reviewsGrid.innerHTML = ""
      mat.reviews.forEach((r) => {
        const card = document.createElement("article")
        card.className = "review-card"
        card.innerHTML = `
          <img src="${r.img || "./assets/sample-pack.jpg"}" alt="${mat.name} example image" />
          <div class="review-body">
            <h3 class="review-title">${r.title}</h3>
            <p class="review-text">${r.text}</p>
          </div>
        `
        reviewsGrid.appendChild(card)
      })
    }

    // Upload preview + keep existing editor redirect behavior
    const uploadInput = byId("upload-input")
    const preview = byId("upload-preview")
    if (uploadInput && preview) {
      uploadInput.addEventListener("change", () => {
        const file = uploadInput.files && uploadInput.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
          const src = String(reader.result)
          preview.src = src
          // also store for editor (existing logic will redirect)
          try {
            sessionStorage.setItem("editor:image", src)
          } catch {}
        }
        reader.readAsDataURL(file)
      })
    }

    // Add to cart (simple demo)
    const addBtn = byId("add-to-cart")
    const qtyEl = byId("qty-input")
    const cartList = byId("cart-items")
    if (addBtn && qtyEl && cartList) {
      addBtn.addEventListener("click", () => {
        const qty = Math.max(1, Number.parseInt(String(qtyEl.value || "1"), 10)) || 1
        const item = document.createElement("div")
        item.className = "cart-item"
        item.innerHTML = `
          <span>${mat.name}</span>
          <span>Qty: ${qty}</span>
        `
        cartList.appendChild(item)
      })
    }
  }

  function initSite() {
    renderYear()
    renderMaterialsListIfPresent()
    populateMaterialDetailIfPresent()
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEditor)
    document.addEventListener("DOMContentLoaded", initSite)
  } else {
    initEditor()
    initSite()
  }
})()
