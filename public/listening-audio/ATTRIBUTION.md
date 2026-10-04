# 注音符號讀音來源

單個注音符號（ㄅ至ㄩ）的音檔出自中華民國教育部《國語注音符號手冊》「國語注音符號體式表」的 F1–F37 錄音：

- 原始來源：https://language.moe.gov.tw/001/Upload/files/site_content/M0001/juyin/html_ch/
- 原始素材下載：https://language.moe.gov.tw/001/Upload/files/site_content/M0001/juyin/bopomofo_materials_20170213.zip
- 授權：Creative Commons Attribution 4.0 International（CC BY 4.0），https://creativecommons.org/licenses/by/4.0/

本站將原始 WAV 轉為 AAC/M4A，以便瀏覽器播放；單個注音符號使用正常速度（1 倍速），沒有把兩次朗讀合併成同一段音檔。唸完後會留 650 毫秒空白，再依使用者設定安排下一次播放。其餘生字、語詞音檔由本專案產生，並非教育部錄音。

## 結合韻例字完整錄音

中華民國教育部（Ministry of Education, R.O.C.）。《國語辭典簡編本》（版本編號：2014_20260929）。網址：https://dict.concised.moe.edu.tw/

- 22 個結合韻改用 `moe-examples/` 中的教育部例字原始 MP3，與官方來源位元組相同，未裁切、轉碼、拼接、改變聲調或加速。錄音包含原始字音、部首、筆畫等屬性，並非獨立結合韻教學音檔。
- 音讀與字詞號對照依教育部 2014_20260929 文字資料庫核對；每個原始 MP3 來源及 SHA-256 保留於 `moe-examples/manifest.json`。
- ㄧㄞ 使用「崖（ㄧㄞˊ）」第二聲，其餘 21 個例字使用第一聲；字形與音讀未改動。
- 授權：創用 CC－姓名標示－禁止改作 臺灣 3.0：https://creativecommons.org/licenses/by-nd/3.0/tw/
- 官方公眾授權資料：https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/dict_concised_download.html
- 完整公眾授權使用說明原 PDF 保留於 `moe-examples/使用說明.pdf`，來源：https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/conciseddict_10312.pdf

舊的結合韻 `.m4a` 為專案產生的錄音；播放路徑已改為上述官方 MP3，舊檔不再使用。
