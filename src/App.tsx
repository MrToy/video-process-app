import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { listen } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import { Command } from "@tauri-apps/api/shell";
import * as path from "@tauri-apps/api/path";
import { createDir } from "@tauri-apps/api/fs";

class Task {
  status: string = "处理中";
  message: string = "";
  static uid = 0;
  id: number = Task.uid++;
  constructor() {}
  desc() {
    return `任务${this.id}: ${this.status} ${this.message}`;
  }
}

function App() {
  const [video, setVideo] = useState("");
  const [output, setOutput] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const newTasks = useRef([] as any[]);
  useEffect(() => {
    newTasks.current = tasks;
  });
  useEffect(() => {
    const unlisten = listen("tauri://file-drop", (event) => {
      setVideo((event.payload as string[])[0]);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const allowDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
  };

  const removeVideo = () => {
    setVideo("");
  };

  const setOutDir = async () => {
    const selected = await open({
      directory: true,
    });
    if (selected) {
      setOutput(selected as string);
    }
  };

  const selectVideo = async () => {
    const selected = await open({
      filters: [
        {
          name: "video",
          extensions: [
            "mp4",
            "mkv",
            "avi",
            "flv",
            "mov",
            "wmv",
            "webm",
            "mpg",
            "mpeg",
            "m4v",
            "rmvb",
            "rm",
            "3gp",
            "f4v",
            "ts",
            "mts",
            "m2ts",
            "vob",
            "dat",
            "asf",
            "divx",
            "dv",
            "m2v",
            "m4v",
            "mxf",
            "ogm",
            "ogv",
            "ogx",
            "ps",
            "qt",
            "tod",
            "tp",
            "trp",
            "ts",
            "tts",
            "vdr",
            "vro",
            "webm",
            "wmv",
            "wtv",
            "xesc",
          ],
        },
      ],
    });
    if (selected) {
      setVideo(selected as string);
    }
  };

  const genImage = async () => {
    if (!video) {
      alert("请先设置视频文件");
      return;
    }
    if (!output) {
      alert("请先设置输出目录");
      return;
    }
    const task = new Task();
    setTasks([task, ...tasks]);
    try {
      const outputPicsDir = await path.join(
        output,
        await path.basename(video, "." + (await path.extname(video)))
      );
      const outputPicsName = await path.join(outputPicsDir, "%05d.jpeg");
      await createDir(outputPicsDir, { recursive: true });
      const result = await Command.sidecar("ffmpeg", [
        "-i",
        video,
        "-f",
        "image2",
        "-q:v",
        "1",
        outputPicsName,
      ]).execute();
      if (result.code != 0) {
        alert("Error: " + result.stderr);
      }
      const status = result.code == 0 ? "成功" : "失败";
      const _newTasks = newTasks.current.map((it) => {
        if (it.id == task.id) {
          it.status = status;
        }
        return it;
      });
      setTasks(_newTasks);
    } catch (e) {
      alert(e);
    }
  };

  return (
    <div className="container">
      <h1>视频处理小工具</h1>

      <div className="row">
        <div className="item">
          <h3>输入文件</h3>
          <div className="drop-area" onDragOver={allowDrop}>
            {video ? (
              <>
                <video
                  className="video"
                  controls
                  src={convertFileSrc(video)}
                ></video>
                <div className="close" onClick={removeVideo}>
                  ✖︎
                </div>
              </>
            ) : (
              <div
                className="drop-area__prompt"
                style={{ cursor: "pointer" }}
                onClick={selectVideo}
              >
                点击 或 拖拽文件
              </div>
            )}
          </div>
        </div>
        <div className="item">
          <h3>输出目录</h3>
          <div
            className="drop-area"
            onClick={setOutDir}
            style={{ cursor: "pointer" }}
          >
            {output ? (
              <span>{output}</span>
            ) : (
              <div className="drop-area__prompt">点击设置</div>
            )}
          </div>
        </div>
        <div className="item">
          <h3>操作</h3>
          <div className="drop-area">
            <div className="btn" onClick={genImage}>
              生成序列帧
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="tasks">
          {tasks.map((task) => (
            <div className="task">
              <div className="task__title">{task.desc()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
