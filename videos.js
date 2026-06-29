/*
  视频页交互脚本：
  - 从 site-data.js 的 videoFiles 读取视频文件。
  - 自动生成视频列表。
  - 点击列表后，在页面内主播放器切换并播放对应视频。
*/

(function () {
  "use strict";

  const files = window.SITE_FILES || {};
  const videos = Array.isArray(files.videoFiles) ? files.videoFiles : [];

  const elements = {
    list: document.getElementById("videoList"),
    player: document.getElementById("mainVideoPlayer"),
    title: document.getElementById("currentVideoTitle"),
    info: document.getElementById("currentVideoInfo"),
    year: document.getElementById("currentYear")
  };

  function toFileUrl(fileName) {
    return encodeURI(fileName || "");
  }

  function setActiveVideo(video, index) {
    elements.player.src = toFileUrl(video.file);
    elements.player.load();
    elements.title.textContent = video.title || video.file;
    elements.info.textContent = video.description || `第 ${index + 1} 个视频`;

    document.querySelectorAll(".video-card").forEach((card) => {
      card.classList.toggle("is-active", Number(card.dataset.index) === index);
    });
  }

  function renderVideoList() {
    elements.list.innerHTML = "";

    if (videos.length === 0) {
      elements.list.innerHTML = '<p class="empty-state">暂时还没有视频文件。</p>';
      elements.title.textContent = "暂无视频";
      elements.info.textContent = "把视频放进文件夹后，在 site-data.js 添加文件名即可。";
      return;
    }

    videos.forEach((video, index) => {
      const card = document.createElement("button");
      card.className = "video-card";
      card.type = "button";
      card.dataset.index = String(index);
      card.innerHTML = `
        <span class="video-thumb">播放</span>
        <strong></strong>
        <span></span>
      `;
      card.querySelector("strong").textContent = video.title || video.file;
      card.querySelector("span:last-child").textContent = video.description || video.file;
      card.addEventListener("click", () => {
        setActiveVideo(video, index);
        elements.player.play().catch(() => {
          elements.info.textContent = "视频已载入，点击播放器即可播放。";
        });
      });
      elements.list.appendChild(card);
    });

    setActiveVideo(videos[0], 0);
  }

  function initVideoPage() {
    elements.year.textContent = new Date().getFullYear();
    renderVideoList();
  }

  initVideoPage();
}());
