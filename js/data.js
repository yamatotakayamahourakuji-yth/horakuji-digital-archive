/*
  法楽寺 真言宗密教の八祖 DIGITAL ARCHIVE

  比較・スライドショー画像:
    images/original/1_元_web.webp ～ 8_元_web.webp
    images/restored/1_最終_web.webp ～ 8_最終_web.webp

  解説専用画像:
    images/explanation/1_解説_web.webp ～ 8_解説_web.webp

  比較用の修正前／修復後は、Photoshopの同一PSD・同一キャンバスから
  同一寸法で書き出したWebPを使用します。
*/
const HACHISO = [
  {id:1,name:"龍猛菩薩",reading:"りゅうみょうぼさつ",role:"第一祖"},
  {id:2,name:"龍智菩薩",reading:"りゅうちぼさつ",role:"第二祖"},
  {id:3,name:"金剛智三蔵",reading:"こんごうちさんぞう",role:"第三祖"},
  {id:4,name:"不空三蔵",reading:"ふくうさんぞう",role:"第四祖"},
  {id:5,name:"善無畏三蔵",reading:"ぜんむいさんぞう",role:"第五祖"},
  {id:6,name:"一行阿闍梨",reading:"いちぎょうあじゃり",role:"第六祖"},
  {id:7,name:"恵果阿闍梨",reading:"けいかあじゃり",role:"第七祖"},
  {id:8,name:"弘法大師",reading:"こうぼうだいし／空海",role:"第八祖"}
].map(p=>({
  ...p,
  original:`images/original/${p.id}_元_web.webp`,
  originalThumb:`images/original/${p.id}_元_thumb.webp`,
  restored:`images/restored/${p.id}_最終_web.webp`,
  restoredThumb:`images/restored/${p.id}_最終_thumb.webp`,
  explanation:`images/explanation/${p.id}_解説_web.webp`,
  // 3D・映像は八祖全員を再制作中。公開準備が整うまで読み込まない。
  threeD:"",
  video:""
}));
