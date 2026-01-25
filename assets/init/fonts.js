export async function loadFont() {
    const font = await new FontFace('DingTalk-JinBuTi', 'url(/libraries/fonts/DingTalk-JinBuTi.ttf)').load();
    document.fonts.add(font);
    document.body.style.fontFamily = 'DingTalk-JinBuTi';
}
