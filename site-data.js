/*
  网站文件清单：
  这个文件是以后最常改的位置。你新增、改名、替换媒体文件时，优先来这里改。

  修改示例：
  - 个人信息 txt 改名了：把 profileTextFile 的值改成新文件名。
  - 头像改名了：把 avatarImage 的值改成新图片名。
  - 首页流光背景想换：把 heroImage 的值改成 assets 里的新图片名。
  - 新增视频：复制 videoFiles 里任意一段 { ... }，改 title 和 file。
  - 新增音频：复制 audioFiles 里任意一段 { ... }，改 title 和 file。

  注意：
  文件名要和文件夹里的真实文件名完全一致，包括中文、空格、标点和后缀。
*/
window.SITE_FILES = {
  // 个人信息文本：主页会自动读取这个 txt，并整理出 B 站名、QQ、Gmail 等信息。
  profileTextFile: "个人信息.txt",

  // 备用个人信息：如果网页是用本地文件方式打开，浏览器可能不允许读取 txt，就先显示这里的内容。
  profileTextFallback: "信息：b站名:希卡里Hikari\nqq:2161463169 gmail:zaixiaxiaoqian@gmail.com",

  // 首页头像：建议使用正方形图片；如果不是正方形，页面也会自动裁切成不变形的头像。
  avatarImage: "头像.jpg",

  // 首页首屏流光背景：这是用 image2 生成后放进 assets 的专属视觉资产。
  heroImage: "assets/hikari-liquid-flow-v3.png",

  // 首页音频作品：当前目录里已有这个 mp3，所以首页会显示音频播放器。
  audioFiles: [
    {
      title: "我还原的《清新的小女孩》",
      file: "我还原的《清新的小女孩》.mp3",
      description: "音频作品"
    }
  ],

  // 视频二级页面：videos.html 会读取这里，生成可点击的视频列表。
  videoFiles: [
    {
      title: "需要的视频1",
      file: "需要的视频1.mp4",
      description: "视频作品 1"
    },
    {
      title: "需要的视频2",
      file: "需要的视频2.mp4",
      description: "视频作品 2"
    }
  ],

  // 未来如果新增非头像图片，可以放到这里；当前只有头像，所以暂时不做图片展示页。
  galleryImages: []
};
