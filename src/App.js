import { useState } from "react";
import "./App.css";

import { Canvas as ThreeCanvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/* ================= MAIN APP ================= */

export default function App() {
  return <Editor />;
}

/* ================= EDITOR ================= */

function Editor() {
  const [activeTool, setActiveTool] = useState("create");

  const [triggerImage, setTriggerImage] = useState(null);
  const [triggerFile, setTriggerFile] = useState(null);

  const [model3D, setModel3D] = useState(null);
  const [modelFile, setModelFile] = useState(null);

  const [resetKey, setResetKey] = useState(0);
  const [drafts, setDrafts] = useState([]);

  function resetEditor() {
    setTriggerImage(null);
    setTriggerFile(null);
    setModel3D(null);
    setModelFile(null);
    setResetKey(k => k + 1);
  }

  /* ================= SAVE DRAFT ================= */

  async function saveDraft() {
    if (!triggerFile || !modelFile) {
      alert("Please add 2D and 3D layers before saving");
      return;
    }

    const formData = new FormData();
    formData.append("image", triggerFile);
    formData.append("model", modelFile);

    formData.append("position", JSON.stringify([0, 0, 0]));
    formData.append("rotation", JSON.stringify([0, 0, 0]));
    formData.append("scale", JSON.stringify([1, 1, 1]));

    await fetch("http://localhost:5000/save-draft", {
      method: "POST",
      body: formData
    });

    alert("Draft saved ✔");
  }

  /* ================= LOAD DRAFTS ================= */

  async function loadDrafts() {
    const res = await fetch("http://localhost:5000/drafts");
    const data = await res.json();
    setDrafts(data);
  }

  return (
    <div className="editor">
      <Header />

      <Toolbar
        triggerFile={triggerFile}
        modelFile={modelFile}
        resetEditor={resetEditor}
        saveDraft={saveDraft}   
      />

      <div className="workspace">
        {/* ICON SIDEBAR */}
        <IconSidebar
          setActiveTool={tool => {
            if (tool === "drafts") loadDrafts();
            setActiveTool(tool);
          }}
        />

        {/* CREATE PANEL */}
        {activeTool === "create" && (
          <CreatePanel
            key={resetKey}
            setTriggerImage={setTriggerImage}
            setTriggerFile={setTriggerFile}
            setModel3D={setModel3D}
            setModelFile={setModelFile}
          />
        )}

        {/* BLACK WORKSPACE */}
        <div className="canvas">
          {activeTool === "create" && (
            <Canvas triggerImage={triggerImage} model3D={model3D} />
          )}

          {activeTool === "drafts" && (
            <DraftsCanvas drafts={drafts} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= HEADER ================= */

function Header() {
  return (
    <div className="header">
      <span className="logo">ARtifact</span>
    </div>
  );
}

/* ================= TOOLBAR ================= */

function Toolbar({ triggerFile, modelFile, resetEditor, saveDraft }) {
  async function publishArtifact() {
    if (!triggerFile || !modelFile) {
      alert("Please add 2D and 3D layers");
      return;
    }

    const formData = new FormData();
    formData.append("image", triggerFile);
    formData.append("model", modelFile);

    const res = await fetch("http://localhost:5000/publish", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    alert("Published!\n" + data.jsonUrl);

    resetEditor();
  }

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button onClick={publishArtifact}>Publish</button>

        {/* ✅ SAVE BUTTON (LEFT OF RESET) */}
        <button onClick={saveDraft}>Save</button>

        <button onClick={resetEditor}>Reset</button>
      </div>
    </div>
  );
}

/* ================= ICON SIDEBAR ================= */

function IconSidebar({ setActiveTool }) {
  return (
    <div className="icon-sidebar">
      <div>⚙</div>

      <div className="active" onClick={() => setActiveTool("create")}>
        ➕
      </div>

      <div onClick={() => setActiveTool("drafts")}>
        ⬛
      </div>

      <div>🐞</div>
    </div>
  );
}

/* ================= CREATE PANEL ================= */

function CreatePanel({
  setTriggerImage,
  setTriggerFile,
  setModel3D,
  setModelFile
}) {
  function upload2D(e) {
    const file = e.target.files[0];
    if (!file) return;

    setTriggerFile(file);
    setTriggerImage(URL.createObjectURL(file));
  }

  function upload3D(e) {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "glb" && ext !== "gltf") {
      alert("Only .glb or .gltf files are supported");
      return;
    }

    setModelFile(file);
    setModel3D(URL.createObjectURL(file));
  }

  return (
    <div className="create-panel">
      <h4>Create</h4>

      <label className="layer-item">
        🖼 2D Layer
        <input type="file" hidden accept="image/*" onChange={upload2D} />
      </label>

      <label className="layer-item">
        🧊 3D Layer
        <input type="file" hidden accept=".glb,.gltf,.fbx" onChange={upload3D} />
      </label>
    </div>
  );
}

/* ================= DRAFTS CANVAS ================= */

function DraftsCanvas({ drafts }) {
  return (
    <div className="drafts-canvas">
      <h2>Saved Drafts</h2>

      {drafts.length === 0 && (
        <p className="empty">No drafts saved</p>
      )}

      <div className="drafts-grid">
        {drafts.map(d => {
          const imageSrc = d.imageUrl;
          const modelSrc = d.modelUrl;

          return (
            <div key={d.id} className="draft-cell">
              {/* SAME STRUCTURE AS CREATE */}
              <div className="draft-preview">
                {/* 2D */}
                {imageSrc && (
                  <img
                    src={imageSrc}
                    className="draft-trigger"
                    alt="draft 2D"
                  />
                )}

                {/* 3D */}
                {modelSrc && (
                  <ThreeCanvas
                      className="draft-model"
                      style={{ width: "100%", height: "100%" }}   // 🔥 THIS LINE
                      camera={{ position: [0, 0, 3], fov: 50 }}
                    >

                    <ambientLight intensity={1.2} />
                    <directionalLight position={[3, 3, 3]} />
                    <Model url={modelSrc} />
                  </ThreeCanvas>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}




/* ================= 3D MODEL ================= */

function Model({ url }) {
  const { scene } = useGLTF(url);

  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());

  scene.position.sub(center);
  scene.scale.set(0.8, 0.8, 0.8);

  return <primitive object={scene} />;
  <OrbitControls />
}

/* ================= CANVAS ================= */

function Canvas({ triggerImage, model3D }) {
  return (
    <>
      {triggerImage && (
        <img src={triggerImage} className="trigger" alt="2D Trigger" />
      )}

      {model3D && (
        <ThreeCanvas
          className="model-overlay"
          camera={{ position: [0, 0, 3], fov: 50 }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[3, 3, 3]} />
          <Model url={model3D} />
          <OrbitControls />
        </ThreeCanvas>
      )}
    </>
  );
}
