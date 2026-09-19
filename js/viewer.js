(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  $$('.compare-corner-labels').forEach(node=>node.remove());
  const el = {
    peopleList:$('#peopleList'), personName:$('#personName'), personReading:$('#personReading'), lineageLabel:$('#lineageLabel'), statusBadge:$('#statusBadge'),
    modeTabs:$('#modeTabs'), compareModeInline:$('#compareModeInline'), compareEffectRow:$('#compareEffectRow'), toolbarLeft:$('.toolbar-left'), imageTypeLabel:$('#imageTypeLabel'), viewer:$('#viewer'),
    exhibitionStage:$('#exhibitionStage'), exhibitionGrid:$('#exhibitionGrid'), exhibitionViewModes:$('#exhibitionViewModes'), exhibitionSpace:$('#exhibitionSpace'), exhibitionSpaceScene:$('.exhibition-space-scene'), exhibitionSpaceTrack:$('#exhibitionSpaceTrack'), exhibitionSpaceLabel:$('#exhibitionSpaceLabel'), exhibitionCameraControls:$('#exhibitionCameraControls'), exhibitionCameraSlider:$('#exhibitionCameraSlider'), exhibitionCameraOutput:$('#exhibitionCameraOutput'), exhibitionCameraResetBtn:$('#exhibitionCameraResetBtn'), exhibitionCompareBtn:$('#exhibitionCompareBtn'), exhibitionExplainBtn:$('#exhibitionExplainBtn'), exhibitionMediaBtn:$('#exhibitionMediaBtn'),
    groupStage:$('#groupStage'), groupGrid:$('#groupGrid'), groupRangeButtons:$('#groupRangeButtons'), groupExitBtn:$('#groupExitBtn'), groupCompareModes:$('#groupCompareModes'), groupStateButtons:$('#groupStateButtons'), groupSliderControl:$('#groupSliderControl'), groupCompareSlider:$('#groupCompareSlider'), groupSliderOutput:$('#groupSliderOutput'),
    singleStage:$('#singleStage'), singleLayer:$('#singleLayer'), singleImage:$('#singleImage'),
    compareStage:$('#compareStage'), compareLayer:$('#compareLayer'), compareOriginal:$('#compareOriginal'), compareRestored:$('#compareRestored'), compareReveal:$('#compareReveal'), compareDivider:$('#compareDivider'),
    compareSlider:$('#compareSlider'), fadeSlider:$('#fadeSlider'), sliderControl:$('#sliderControl'), fadeControl:$('#fadeControl'), compareStateButtons:$('#compareStateButtons'),
    slideshowControls:$('#slideshowControls'), slideshowStage:$('#slideshowStage'), slideshowLayer:$('#slideshowLayer'), slideshowImageA:$('#slideshowImageA'), slideshowImageB:$('#slideshowImageB'), slideEffectModes:$('#slideEffectModes'), slidePersonLabel:$('#slidePersonLabel'), slideStateBadge:$('#slideStateBadge'), slideCounter:$('#slideCounter'), slidePlayBtn:$('#slidePlayBtn'),
    threeDStage:$('#threeDStage'), mediaComingSoonPerson:$('#mediaComingSoonPerson'), missingOverlay:$('#missingOverlay'), missingTitle:$('#missingTitle'), missingPath:$('#missingPath'),
    zoomLabel:$('#zoomLabel'), helpModal:$('#helpModal'), exhibitionCompareModal:$('#exhibitionCompareModal'), exhibitionCompareTitle:$('#exhibitionCompareTitle'), exhibitionQuickCompareView:$('#exhibitionQuickCompareView'), exhibitionQuickExplainView:$('#exhibitionQuickExplainView'), exhibitionQuickMediaView:$('#exhibitionQuickMediaView'), exhibitionQuickMediaMode:$('#exhibitionQuickMediaMode'), exhibitionQuickCompare:$('.exhibition-quick-compare'), exhibitionQuickOriginal:$('#exhibitionQuickOriginal'), exhibitionQuickRestored:$('#exhibitionQuickRestored'), exhibitionQuickDivider:$('#exhibitionQuickDivider'), exhibitionQuickExplanation:$('#exhibitionQuickExplanation'), exhibitionQuickVideo:$('#exhibitionQuickVideo'), exhibitionQuickSlider:$('#exhibitionQuickSlider'), exhibitionQuickDetailBtn:$('#exhibitionQuickDetailBtn')
  };

  const MODES=[['exhibition','展示室'],['group','グループ比較'],['compare','比較'],['explain','解説'],['3d','3D・動画'],['slideshow','スライドショー']];
  const SLIDES=HACHISO.flatMap(p=>[
    {person:p,state:'before',label:'Before（現存肖像）',path:p.original},
    {person:p,state:'after',label:'After（修復済み）',path:p.restored}
  ]);

  let person=HACHISO[7], mode='compare', compareMode='slider';
  let view={scale:1,x:0,y:0}, drag=null, compareDividerDrag=null, groupDividerDrag=null, quickDividerDrag=null, compareState='before';
  let exhibitionView='grid', exhibitionIndex=0, exhibitionCameraAngle=0, exhibitionQuickView='compare';
  let exhibitionSwipeStartX=null, exhibitionSwipeStartAngle=0, exhibitionRotationDrag=false, exhibitionSwipeMoved=false;
  let groupStart=1, groupState='before', groupCompareMode='toggle', groupSliderValue=50;
  let slideIndex=0, slideTimer=null, slideshowPlaying=false, slideEffect='dissolve', activeSlideImg=0, slideTransitioning=false;

  function usesSmartphoneLayout(){
    return window.matchMedia('(max-width:720px)').matches
      || window.matchMedia('(orientation:landscape) and (max-height:500px) and (pointer:coarse)').matches;
  }

  function buildPeople(){
    el.peopleList.innerHTML='';
    HACHISO.forEach(p=>{
      const b=document.createElement('button');
      b.className='person-btn'+(p.id===person.id?' active':'');
      b.innerHTML=`<span class="person-no">${p.id}</span><span><strong>${p.name}</strong><small>${p.reading}</small></span>`;
      b.onclick=()=>{
        if(mode==='slideshow' || mode==='exhibition' || mode==='group'){
          if(mode==='slideshow') stopSlideshow();
          mode='compare';
          person=p;
          resetView();
          sync();
          return;
        }
        person=p;
        resetView();
        sync();
      };
      el.peopleList.appendChild(b);
    });
  }

  function buildTabs(){
    el.modeTabs.innerHTML='';
    MODES.forEach(([key,label])=>{
      const b=document.createElement('button');
      b.textContent=label;
      b.className=key===mode?'active':'';
      b.onclick=()=>{
        if(mode==='slideshow') stopSlideshow();
        mode=key;
        if(mode==='slideshow') slideIndex=0;
        resetView();
        sync();
      };
      el.modeTabs.appendChild(b);
    });
  }

  function syncHeader(){
    if(mode==='exhibition'){
      el.personName.textContent='八祖展示室';
      el.personReading.textContent='';
      el.lineageLabel.textContent='法楽寺デジタルアーカイブ';
      el.statusBadge.textContent='8人展示';
      return;
    }
    if(mode==='group'){
      const mobileGroup=usesSmartphoneLayout();
      const groupEnd=groupStart+(mobileGroup?1:3);
      el.personName.textContent=`第${groupStart}祖〜第${groupEnd}祖`;
      el.personReading.textContent='';
      el.lineageLabel.textContent='真言宗密教の八祖・グループ比較';
      el.statusBadge.textContent=mobileGroup?'2人表示':'4人表示';
      return;
    }
    el.personName.textContent=person.name;
    el.personReading.textContent=person.reading;
    el.lineageLabel.textContent=`真言宗密教の八祖・${person.role}`;
    el.statusBadge.textContent=person.id===8?'完成サンプル作成中':'画像準備中';
  }

  function updatePeopleActive(){
    $$('.person-btn').forEach((b,i)=>b.classList.toggle('active',HACHISO[i].id===person.id));
  }

  function setStage(which){
    document.documentElement.classList.toggle('compare-view-active',which==='compare');
    document.body.classList.toggle('group-view-active',which==='group');
    document.body.classList.toggle('exhibition-view-active',which==='exhibition');
    document.body.classList.toggle('compare-view-active',which==='compare');
    el.exhibitionCameraControls.classList.toggle('hidden',which!=='exhibition' || exhibitionView!=='space');
    el.viewer.classList.toggle('exhibition-mode',which==='exhibition');
    el.viewer.classList.toggle('group-mode',which==='group');
    el.exhibitionStage.classList.toggle('hidden',which!=='exhibition');
    el.groupStage.classList.toggle('hidden',which!=='group');
    el.singleStage.classList.toggle('hidden',which!=='single');
    el.compareStage.classList.toggle('hidden',which!=='compare');
    el.slideshowStage.classList.toggle('hidden',which!=='slideshow');
    el.threeDStage.classList.toggle('hidden',which!=='3d');
    const compareVisible=which==='compare';
    const zoomVisible=which==='compare';
    el.toolbarLeft.classList.toggle('hidden',!zoomVisible);
    el.compareModeInline.classList.toggle('hidden',!compareVisible);
    el.compareEffectRow.classList.toggle('hidden',!compareVisible);
    el.slideshowControls.classList.toggle('hidden',which!=='slideshow');
  }

  function clearMobileCompareGeometry(){
    el.viewer.style.removeProperty('--mobile-compare-viewer-height');
    el.viewer.style.removeProperty('--mobile-compare-image-width');
    el.viewer.style.removeProperty('--mobile-compare-image-height');
  }

  function lockCompareGeometry(){
    const mobilePortrait=window.matchMedia('(max-width:720px) and (orientation:portrait)').matches;
    const mobileLandscape=window.matchMedia('(orientation:landscape) and (max-height:500px) and (pointer:coarse)').matches;
    if(mode!=='compare'){
      clearMobileCompareGeometry();
      return;
    }
    const naturalWidth=el.compareOriginal.naturalWidth;
    const naturalHeight=el.compareOriginal.naturalHeight;
    if(!naturalWidth || !naturalHeight)return;
    const viewerRect=el.viewer.getBoundingClientRect();
    const viewerHeight=viewerRect.height;
    const maxWidth=Math.max(1,viewerRect.width-20);
    const maxHeight=Math.max(1,viewerHeight*(mobilePortrait || mobileLandscape ? 1 : .92));
    const scale=Math.min(maxWidth/naturalWidth,maxHeight/naturalHeight);
    const width=naturalWidth*scale;
    const height=naturalHeight*scale;
    [el.compareOriginal,el.compareRestored].forEach(image=>{
      image.style.width=`${width}px`;
      image.style.height=`${height}px`;
    });
    if(mobilePortrait || mobileLandscape){
      el.viewer.style.setProperty('--mobile-compare-viewer-height',`${viewerHeight}px`);
      el.viewer.style.setProperty('--mobile-compare-image-width',`${width}px`);
      el.viewer.style.setProperty('--mobile-compare-image-height',`${height}px`);
    } else {
      clearMobileCompareGeometry();
    }
  }

  function showExhibition(){
    setStage('exhibition');
    el.viewer.classList.remove('explain-mode','compare-fixed');
    el.imageTypeLabel.textContent='真言宗密教の八祖 展示室';
    setMissing(false);
    el.exhibitionGrid.innerHTML='';
    el.exhibitionSpaceTrack.innerHTML='';

    HACHISO.forEach((p,index)=>{
      const card=document.createElement('button');
      card.className='exhibition-card';
      card.setAttribute('aria-label',`${p.role} ${p.name}の修復前後を比較する`);
      card.innerHTML=`<span class="exhibition-frame"><img src="${p.restoredThumb}?v=29" alt="${p.name} 修復済み肖像" draggable="false"></span><span class="exhibition-plaque"><small>${p.role}</small><strong>${p.name}</strong><span>${p.reading}</span></span>`;
      card.onclick=()=>{
        exhibitionIndex=index;
        openExhibitionDetail('compare');
      };
      el.exhibitionGrid.appendChild(card);

      const spaceCard=document.createElement('button');
      spaceCard.className='exhibition-space-card';
      spaceCard.dataset.exhibitionIndex=index;
      spaceCard.setAttribute('aria-label',`${p.role} ${p.name}`);
      spaceCard.innerHTML=`<span class="exhibition-space-frame"><img src="${p.restoredThumb}?v=28" alt="${p.name} 修復済み肖像" draggable="false"></span><span class="exhibition-space-plaque"><small>${p.role}</small><strong>${p.name}</strong></span>`;
      spaceCard.onclick=()=>{
        if(exhibitionSwipeMoved)return;
        if(index!==exhibitionIndex){
          exhibitionIndex=index;
          updateExhibitionView();
          return;
        }
        openExhibitionComparePanel();
      };
      el.exhibitionSpaceTrack.appendChild(spaceCard);
    });
    updateExhibitionView();
  }

  function updateExhibitionView(){
    const spaceVisible=exhibitionView==='space';
    el.exhibitionGrid.classList.toggle('hidden',spaceVisible);
    el.exhibitionSpace.classList.toggle('hidden',!spaceVisible);
    el.exhibitionCameraControls.classList.toggle('hidden',!spaceVisible);
    $$('#exhibitionViewModes button').forEach(b=>b.classList.toggle('active',b.dataset.exhibitionView===exhibitionView));
    if(!spaceVisible)return;

    el.exhibitionSpaceScene.style.setProperty('--exhibition-camera-angle',`${exhibitionCameraAngle}deg`);
    el.exhibitionSpaceScene.style.setProperty('--exhibition-light-x',`${50+exhibitionCameraAngle*1.25}%`);
    el.exhibitionCameraSlider.value=exhibitionCameraAngle;
    el.exhibitionCameraOutput.textContent=`${Math.round(exhibitionCameraAngle)}°`;

    const spacing=window.matchMedia('(max-width:720px)').matches?118:205;
    $$('.exhibition-space-card').forEach((card,index)=>{
      const delta=index-exhibitionIndex;
      const distance=Math.abs(delta);
      card.classList.toggle('is-active',delta===0);
      card.setAttribute('aria-current',delta===0?'true':'false');
      card.style.transform=`translate(-50%,-50%) translateX(${delta*spacing}px) translateZ(${-distance*135}px) rotateY(${delta*-17}deg)`;
      card.style.opacity=distance>3?'0':String(Math.max(.22,1-distance*.23));
      card.style.zIndex=String(10-distance);
      card.style.pointerEvents=distance>3?'none':'auto';
    });
    const active=HACHISO[exhibitionIndex];
    el.exhibitionSpaceLabel.innerHTML=`<small>${active.role}</small><strong>${active.name}</strong>`;
  }

  function openExhibitionDetail(nextMode){
    el.exhibitionQuickVideo.pause();
    el.exhibitionCompareModal.classList.add('hidden');
    person=HACHISO[exhibitionIndex];
    mode=nextMode;
    resetView();
    sync();
  }

  function openExhibitionComparePanel(){
    const active=HACHISO[exhibitionIndex];
    el.exhibitionCompareTitle.textContent=`${active.role} ${active.name}`;
    el.exhibitionQuickOriginal.src=`${active.original}?v=44`;
    el.exhibitionQuickRestored.src=`${active.restored}?v=44`;
    el.exhibitionQuickExplanation.src=`${active.explanation}?v=44`;
    el.exhibitionQuickMediaMode.classList.toggle('hidden',!active.video);
    if(active.video){
      el.exhibitionQuickVideo.src=`${active.video}?v=44`;
    } else {
      el.exhibitionQuickVideo.removeAttribute('src');
      el.exhibitionQuickVideo.load();
    }
    el.exhibitionQuickSlider.value=50;
    el.exhibitionQuickCompare.style.setProperty('--quick-position','50%');
    el.exhibitionQuickDivider.setAttribute('aria-valuenow','50');
    el.exhibitionQuickDivider.classList.remove('at-start','at-end');
    updateExhibitionQuickView('compare');
    el.exhibitionCompareModal.classList.remove('hidden');
    $('#closeExhibitionCompare').focus();
  }

  function updateExhibitionQuickView(nextView){
    exhibitionQuickView=nextView;
    const explain=nextView==='explain';
    const media=nextView==='media';
    el.exhibitionQuickCompareView.classList.toggle('hidden',explain || media);
    el.exhibitionQuickExplainView.classList.toggle('hidden',!explain);
    el.exhibitionQuickMediaView.classList.toggle('hidden',!media);
    if(!media)el.exhibitionQuickVideo.pause();
    $$('#exhibitionQuickModes button').forEach(button=>button.classList.toggle('active',button.dataset.quickView===nextView));
    el.exhibitionQuickDetailBtn.textContent=media?'3D・動画画面で詳しく見る':explain?'解説画面で詳しく見る':'比較画面で詳しく見る';
  }

  function updateGroupState(){
    const sliderMode=groupCompareMode==='slider';
    const transition=getCompareTransition(groupSliderValue);
    el.groupStage.classList.toggle('show-after',!sliderMode && groupState==='after');
    el.groupStage.classList.toggle('slider-mode',sliderMode);
    el.groupStage.classList.toggle('group-at-start',transition.progress===0);
    el.groupStage.classList.toggle('group-at-end',transition.progress===100);
    el.groupStage.style.setProperty('--group-compare-position',`${transition.progress}%`);
    el.groupStage.style.setProperty('--group-overlay-hidden',`${100-transition.progress}%`);
    $$('#groupRangeButtons button').forEach(b=>b.classList.toggle('active',+b.dataset.groupStart===groupStart));
    $$('#groupCompareModes button').forEach(b=>b.classList.toggle('active',b.dataset.groupMode===groupCompareMode));
    $$('#groupStateButtons button').forEach(b=>{
      const stageValue={before:0,after:100}[b.dataset.groupState];
      b.classList.toggle('active',sliderMode?Math.abs(groupSliderValue-stageValue)<.01:b.dataset.groupState===groupState);
    });
    el.groupStateButtons.classList.remove('hidden');
    el.groupSliderControl.classList.toggle('hidden',!sliderMode);
    el.groupCompareSlider.value=groupSliderValue;
    el.groupSliderOutput.textContent=`${groupSliderValue}%`;
    $$('.group-divider').forEach(divider=>{
      divider.setAttribute('aria-valuenow',String(groupSliderValue));
      divider.setAttribute('aria-valuetext',transition.label);
    });
    el.imageTypeLabel.textContent=sliderMode
      ?`グループ比較　${transition.label}`
      :`グループ比較　${groupState==='after'?'After（修復済み）':'Before（現存肖像）'}`;
  }

  function showGroupCompare(){
    setStage('group');
    el.viewer.classList.remove('explain-mode','compare-fixed');
    syncHeader();
    setMissing(false);
    el.groupGrid.innerHTML='';

    const groupSize=usesSmartphoneLayout()?2:4;
    HACHISO.filter(p=>p.id>=groupStart && p.id<groupStart+groupSize).forEach(p=>{
      const card=document.createElement('button');
      card.className='group-card';
      card.setAttribute('aria-label',`${p.role} ${p.name}の個別比較を見る`);

      const media=document.createElement('span');
      media.className='group-media';

      const original=document.createElement('img');
      original.className='group-image group-original';
      original.src=p.originalThumb+'?v=18';
      original.alt=`${p.name} 現存肖像`;
      original.draggable=false;

      const restored=document.createElement('img');
      restored.className='group-image group-restored';
      restored.src=p.restoredThumb+'?v=18';
      restored.alt=`${p.name} 修復済み肖像`;
      restored.draggable=false;

      const divider=document.createElement('span');
      divider.className='group-divider';
      divider.setAttribute('role','slider');
      divider.setAttribute('tabindex','0');
      divider.setAttribute('aria-label',`${p.name}の一括比較位置`);
      divider.setAttribute('aria-valuemin','0');
      divider.setAttribute('aria-valuemax','100');
      divider.innerHTML='<span class="group-divider-handle" aria-hidden="true">⇔</span>';
      divider.onclick=event=>{event.preventDefault();event.stopPropagation()};

      const caption=document.createElement('span');
      caption.className='group-caption';
      caption.innerHTML=`<span class="group-role">${p.id}</span><span><strong>${p.name}</strong><small>${p.reading}</small></span>`;

      media.append(original,restored,divider);
      card.append(media,caption);
      card.onclick=()=>{
        person=p;
        mode='compare';
        resetView();
        sync();
      };
      el.groupGrid.appendChild(card);
    });
    updateGroupState();
  }

  function setMissing(show,path='',title='画像未配置'){
    el.missingOverlay.classList.toggle('hidden',!show);
    el.missingTitle.textContent=title;
    el.missingPath.textContent=path;
  }

  function loadImg(img,path,onOk,onFail){
    img.onload=()=>{onOk&&onOk()};
    img.onerror=()=>{onFail&&onFail(path)};
    img.src=path+'?v=17';
  }

  function fitExplanationToCompareFrame(){
    // 比較画像の100%表示は「viewer高さの92% × 1600:2262」。
    // 解説もその同一ピクセル枠・同一中心位置に置く。
    const frame=document.querySelector('.explanation-frame');
    if(!frame || !el.viewer) return;
    const viewerH=el.viewer.clientHeight;
    if(!viewerH) return;
    const h=viewerH*0.92;
    const w=h*(1600/2262);
    frame.style.setProperty('width',`${w}px`,'important');
    frame.style.setProperty('height',`${h}px`,'important');
    frame.style.setProperty('left','50%','important');
    frame.style.setProperty('top','50%','important');
    frame.style.setProperty('transform','translate(-50%,-50%)','important');
  }

  function showExplanation(){
    setStage('single');
    el.viewer.classList.add('explain-mode');
    el.viewer.classList.remove('compare-fixed');
    // 解説へ入るたびに必ず初期倍率・中央位置へ戻す
    view={scale:1,x:0,y:0};
    fitExplanationToCompareFrame();
    el.imageTypeLabel.textContent='解説';
    el.singleImage.alt=`${person.name} 解説`;
    el.singleImage.style.visibility='';
    setMissing(false);
    loadImg(el.singleImage,person.explanation,()=>{fitExplanationToCompareFrame();setMissing(false)},p=>setMissing(true,p,'解説画像未配置'));
    applyView();
  }

  function showCompare(){
    setStage('compare');
    el.viewer.classList.remove('explain-mode');
    el.viewer.classList.add('compare-fixed');
    clearMobileCompareGeometry();
    setMissing(false);
    let ok=0, failed=[];
    const done=()=>{
      ok++;
      if(ok===2){
        setMissing(false);
        requestAnimationFrame(lockCompareGeometry);
      }
    };
    const fail=p=>{failed.push(p);setMissing(true,failed.join(' / '),'比較画像未配置')};
    loadImg(el.compareOriginal,person.original,done,fail);
    loadImg(el.compareRestored,person.restored,done,fail);
    updateCompareEffect();
    applyView();
  }

  function show3d(){
    setStage('3d');
    el.viewer.classList.remove('explain-mode','compare-fixed');
    el.imageTypeLabel.textContent='3D・動画';
    el.statusBadge.textContent='公開準備中';
    el.mediaComingSoonPerson.textContent=`${person.role} ${person.name}`;
    setMissing(false);
  }

  function showSlideshow(){
    setStage('slideshow');
    el.viewer.classList.remove('explain-mode','compare-fixed');
    renderSlide(true);
    applyView();
  }

  function updateSlideMeta(slide){
    person=slide.person;
    syncHeader();
    updatePeopleActive();
    el.slideCounter.textContent=`${slideIndex+1} / ${SLIDES.length}`;
    el.slidePersonLabel.textContent=`${slide.person.id}. ${slide.person.name}（${slide.person.reading}）`;
    el.slideStateBadge.textContent=slide.label;
    el.slideStateBadge.classList.toggle('before',slide.state==='before');
    el.slideStateBadge.classList.toggle('after',slide.state==='after');
    el.imageTypeLabel.textContent=`${slide.person.name}　${slide.label}`;
  }

  function currentSlideImage(){ return activeSlideImg===0?el.slideshowImageA:el.slideshowImageB; }
  function nextSlideImage(){ return activeSlideImg===0?el.slideshowImageB:el.slideshowImageA; }

  function setSlideEffectClass(){
    el.slideshowStage.classList.remove('effect-dissolve','effect-slide');
    el.slideshowStage.classList.add(`effect-${slideEffect}`);
    $$('#slideEffectModes button').forEach(b=>b.classList.toggle('active',b.dataset.slideEffect===slideEffect));
  }

  function resetSlideImageClasses(img){
    img.classList.remove('current','pre-enter','entering','leaving');
  }

  function renderSlide(initial=false){
    const slide=SLIDES[slideIndex];
    updateSlideMeta(slide);
    setSlideEffectClass();
    setMissing(false);
    const img=currentSlideImage();
    const other=nextSlideImage();
    resetSlideImageClasses(img);
    resetSlideImageClasses(other);
    img.classList.add('current');
    img.alt=`${slide.person.name} ${slide.label}`;
    loadImg(img,slide.path,()=>setMissing(false),p=>setMissing(true,p,'スライド画像未配置'));
  }

  function transitionToSlide(targetIndex,direction=1){
    if(slideTransitioning || targetIndex===slideIndex)return;
    const targetSlide=SLIDES[targetIndex];
    const incoming=nextSlideImage();
    const outgoing=currentSlideImage();
    slideTransitioning=true;

    const preloader=new Image();
    preloader.onload=()=>{
      setMissing(false);
      slideIndex=targetIndex;
      updateSlideMeta(targetSlide);
      setSlideEffectClass();
      el.slideshowStage.classList.toggle('dir-next',direction>=0);
      el.slideshowStage.classList.toggle('dir-prev',direction<0);

      resetSlideImageClasses(incoming);
      resetSlideImageClasses(outgoing);
      outgoing.classList.add('current');
      incoming.src=targetSlide.path+'?v=8';
      incoming.alt=`${targetSlide.person.name} ${targetSlide.label}`;
      incoming.classList.add('pre-enter');

      // 1フレーム待ってから遷移を開始し、CSS transitionを確実に発火させる
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        incoming.classList.remove('pre-enter');
        incoming.classList.add('entering');
        outgoing.classList.add('leaving');
      }));

      const duration=slideEffect==='slide'?760:920;
      window.setTimeout(()=>{
        resetSlideImageClasses(outgoing);
        resetSlideImageClasses(incoming);
        incoming.classList.add('current');
        activeSlideImg=activeSlideImg===0?1:0;
        el.slideshowStage.classList.remove('dir-next','dir-prev');
        slideTransitioning=false;
      },duration);
    };
    preloader.onerror=()=>{
      setMissing(true,targetSlide.path,'スライド画像未配置');
      slideTransitioning=false;
    };
    preloader.src=targetSlide.path+'?v=8';
  }

  function stepSlide(delta){
    const target=slideIndex+delta;
    if(target<0){
      return;
    }
    if(target>=SLIDES.length){
      stopSlideshow();
      return;
    }
    transitionToSlide(target,delta>=0?1:-1);
  }

  function startSlideshow(){
    if(slideTimer) return;
    if(slideIndex>=SLIDES.length-1){
      slideIndex=0;
      renderSlide(true);
    }
    slideshowPlaying=true;
    el.slidePlayBtn.textContent='⏸ 一時停止';
    el.slidePlayBtn.classList.add('playing');
    slideTimer=setInterval(()=>{
      if(slideIndex>=SLIDES.length-1){
        stopSlideshow();
        return;
      }
      stepSlide(1);
    },3200);
  }

  function stopSlideshow(){
    slideshowPlaying=false;
    if(slideTimer){clearInterval(slideTimer);slideTimer=null;}
    if(el.slidePlayBtn){
      el.slidePlayBtn.textContent='▶ 再生';
      el.slidePlayBtn.classList.remove('playing');
    }
  }

  function sync(){
    buildPeople();
    buildTabs();
    syncHeader();
    if(mode==='exhibition')showExhibition();
    if(mode==='group')showGroupCompare();
    if(mode==='compare')showCompare();
    if(mode==='explain')showExplanation();
    if(mode==='3d')show3d();
    if(mode==='slideshow')showSlideshow();
  }

  function resetView(){
    view={scale:1,x:0,y:0};
    if(mode==='explain')fitExplanationToCompareFrame();
    applyView();
  }

  function applyView(){
    const t=`translate(${view.x}px,${view.y}px) scale(${view.scale})`;
    el.singleLayer.style.transform=t;
    el.compareLayer.style.transform=t;
    el.slideshowLayer.style.transform=t;
    el.zoomLabel.textContent=Math.round(view.scale*100)+'%';
    el.compareOriginal.style.transform='translate(-50%,-50%)';
    el.compareRestored.style.transform='translate(-50%,-50%)';
  }

  function updateCompareStateButtons(){
    $$('#compareStateButtons button').forEach(button=>{
      const stageValue={before:0,after:100}[button.dataset.state];
      const directValue=compareMode==='fade'?+el.fadeSlider.value:+el.compareSlider.value;
      const active=(compareMode==='toggle' && button.dataset.state===compareState)
        || ((compareMode==='slider' || compareMode==='fade') && Math.abs(directValue-stageValue)<.01);
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  function showCompareBase(base){
    el.compareOriginal.style.opacity=base==='before'?1:0;
    el.compareReveal.style.opacity=base==='after'?1:0;
  }

  function showCompareOverlay(opacity,clipPath){
    el.compareReveal.style.opacity=opacity;
    el.compareReveal.style.clipPath=clipPath;
  }

  function getCompareTransition(value){
    return {
      progress:value,
      label:value===0?'Before（現存肖像）':value===100?'After（修復済み）':'Before / After'
    };
  }

  function updateCompareEffect(){
    $$('#compareModeInline > button[data-compare]').forEach(b=>b.classList.toggle('active',b.dataset.compare===compareMode));
    // 左右スライダーでは比較画像そのものを固定（クリック／ドラッグで動かさない）
    const sliderLocked=(mode==='compare' && (compareMode==='slider' || compareMode==='fade'));
    el.viewer.classList.toggle('slider-locked',sliderLocked);
    if(sliderLocked){
      drag=null;
      view={scale:1,x:0,y:0};
      applyView();
    }
    el.sliderControl.classList.toggle('hidden',compareMode!=='slider');
    el.fadeControl.classList.toggle('hidden',compareMode!=='fade');
    el.compareEffectRow.classList.toggle('no-effect',compareMode==='toggle');
    el.compareDivider.classList.toggle('hidden',compareMode!=='slider' && compareMode!=='fade');
    el.compareOriginal.style.opacity=0;
    el.compareReveal.style.opacity=0;
    el.compareReveal.style.clipPath='inset(0)';
    updateCompareStateButtons();
    if(compareMode==='slider'){
      const v=+el.compareSlider.value;
      const transition=getCompareTransition(v);
      showCompareBase('before');
      showCompareOverlay(1,`inset(0 ${100-transition.progress}% 0 0)`);
      el.compareDivider.style.left=transition.progress+'%';
      el.compareDivider.classList.toggle('at-start',transition.progress===0);
      el.compareDivider.classList.toggle('at-end',transition.progress===100);
      el.compareDivider.setAttribute('aria-valuenow',String(v));
      el.compareDivider.setAttribute('aria-valuetext',transition.label);
      el.imageTypeLabel.textContent=transition.label.includes(' / ')?`${transition.label} 比較`:transition.label;
    } else if(compareMode==='fade'){
      const transition=getCompareTransition(+el.fadeSlider.value);
      showCompareBase('before');
      showCompareOverlay(transition.progress/100,'inset(0)');
      el.compareDivider.style.left=transition.progress+'%';
      el.compareDivider.classList.toggle('at-start',transition.progress===0);
      el.compareDivider.classList.toggle('at-end',transition.progress===100);
      el.compareDivider.setAttribute('aria-valuenow',String(+el.fadeSlider.value));
      el.compareDivider.setAttribute('aria-valuetext',transition.label);
      el.imageTypeLabel.textContent=transition.label.includes(' / ')?`${transition.label} クロスフェード`:transition.label;
    } else {
      showCompareBase(compareState);
      el.imageTypeLabel.textContent=compareState==='after'?'After（修復済み）':'Before（現存肖像）';
    }
  }

  function bind(){
    const opening=$('#openingScreen'), openingEnter=$('#openingEnterBtn');
    document.querySelectorAll('img').forEach(image=>{image.draggable=false});
    document.addEventListener('contextmenu',event=>{
      if(event.target instanceof Element && event.target.closest('img, .viewer, .exhibition-space-scene, .exhibition-quick-stage')){
        event.preventDefault();
      }
    });
    document.addEventListener('dragstart',event=>{
      if(event.target instanceof HTMLImageElement)event.preventDefault();
    });
    const closeOpening=()=>{
      if(!opening || opening.classList.contains('is-closing'))return;
      opening.classList.add('is-closing');
      setTimeout(()=>opening.remove(),950);
    };
    if(openingEnter) openingEnter.onclick=closeOpening;
    document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ') && opening && document.body.contains(opening))closeOpening()});

    window.addEventListener('resize',()=>{
      if(mode==='explain'){fitExplanationToCompareFrame();applyView();}
      if(mode==='compare')lockCompareGeometry();
      if(mode==='exhibition' && exhibitionView==='space')updateExhibitionView();
    });
    window.addEventListener('orientationchange',()=>{
      if(mode==='compare')setTimeout(lockCompareGeometry,150);
    });

    $('#zoomInBtn').onclick=()=>{view.scale=Math.min(5,view.scale*1.15);applyView()};
    $('#zoomOutBtn').onclick=()=>{view.scale=Math.max(.5,view.scale/1.15);applyView()};
    $('#resetBtn').onclick=resetView;

    el.viewer.addEventListener('wheel',e=>{
      if(mode==='3d')return;
      if(mode==='exhibition' || mode==='group')return;
      if(mode==='compare' && (compareMode==='slider' || compareMode==='fade')){
        e.preventDefault();
        return;
      }
      e.preventDefault();
      view.scale=Math.max(.5,Math.min(5,view.scale*(e.deltaY<0?1.1:.9)));
      applyView();
    },{passive:false});

    el.viewer.addEventListener('pointerdown',e=>{
      if(mode==='3d')return;
      // 比較は位置合わせが前提なので画像自体をドラッグさせない
      if(mode==='compare'){
        drag=null;
        // スマホの縦スワイプはページスクロールへ渡し、画像の揺れを防ぐ
        if(e.pointerType==='mouse'){
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if(mode==='exhibition' || mode==='group'){
        drag=null;
        return;
      }
      // 一覧・グループ比較内の操作ボタンは、ビューアのパンより優先する
      if(e.target.closest('button,input')){
        drag=null;
        return;
      }
      drag={x:e.clientX,y:e.clientY,ox:view.x,oy:view.y};
      el.viewer.setPointerCapture(e.pointerId);
    });
    el.viewer.addEventListener('pointermove',e=>{
      if(mode==='compare'){drag=null;return;}
      if(!drag)return;
      view.x=drag.ox+(e.clientX-drag.x);
      view.y=drag.oy+(e.clientY-drag.y);
      applyView();
    });
    el.viewer.addEventListener('pointerup',()=>drag=null);
    el.viewer.addEventListener('pointercancel',()=>drag=null);

    const setCompareSliderFromPointer=e=>{
      const rect=el.compareLayer.getBoundingClientRect();
      if(!rect.width)return;
      const position=Math.max(0,Math.min(100,((e.clientX-rect.left)/rect.width)*100));
      const input=compareDividerDrag?.mode==='fade'?el.fadeSlider:el.compareSlider;
      input.value=position.toFixed(1);
      updateCompareEffect();
    };
    el.compareDivider.addEventListener('pointerdown',e=>{
      if(mode!=='compare' || (compareMode!=='slider' && compareMode!=='fade'))return;
      e.preventDefault();
      e.stopPropagation();
      compareDividerDrag={pointerId:e.pointerId,mode:compareMode};
      el.compareDivider.classList.add('is-dragging');
      el.compareDivider.setPointerCapture(e.pointerId);
      setCompareSliderFromPointer(e);
    });
    el.compareDivider.addEventListener('pointermove',e=>{
      if(compareDividerDrag?.pointerId!==e.pointerId)return;
      e.preventDefault();
      setCompareSliderFromPointer(e);
    });
    const finishCompareDividerDrag=e=>{
      if(compareDividerDrag?.pointerId!==e.pointerId)return;
      compareDividerDrag=null;
      el.compareDivider.classList.remove('is-dragging');
      if(el.compareDivider.hasPointerCapture(e.pointerId))el.compareDivider.releasePointerCapture(e.pointerId);
    };
    el.compareDivider.addEventListener('pointerup',finishCompareDividerDrag);
    el.compareDivider.addEventListener('pointercancel',finishCompareDividerDrag);
    el.compareDivider.addEventListener('keydown',e=>{
      if(mode!=='compare' || (compareMode!=='slider' && compareMode!=='fade'))return;
      const step=e.shiftKey?5:1;
      const input=compareMode==='fade'?el.fadeSlider:el.compareSlider;
      let next=+input.value;
      if(e.key==='ArrowLeft')next-=step;
      else if(e.key==='ArrowRight')next+=step;
      else if(e.key==='Home')next=0;
      else if(e.key==='End')next=100;
      else return;
      e.preventDefault();
      input.value=String(Math.max(0,Math.min(100,next)));
      updateCompareEffect();
    });

    $$('#compareModeInline > button[data-compare]').forEach(b=>b.onclick=()=>{
      compareMode=b.dataset.compare;
      updateCompareEffect();
    });
    $$('#compareStateButtons button').forEach(b=>b.onclick=()=>{
      compareState=b.dataset.state;
      if(compareMode==='slider' || compareMode==='fade'){
        const input=compareMode==='fade'?el.fadeSlider:el.compareSlider;
        input.value=String({before:0,after:100}[compareState]);
        updateCompareEffect();
        return;
      }
      compareMode='toggle';
      updateCompareEffect();
    });
    el.compareSlider.oninput=updateCompareEffect;
    el.fadeSlider.oninput=updateCompareEffect;

    $$('#groupRangeButtons button').forEach(b=>b.onclick=()=>{
      groupStart=+b.dataset.groupStart;
      showGroupCompare();
    });
    el.groupExitBtn.onclick=()=>{
      mode='compare';
      resetView();
      sync();
    };
    $$('#groupCompareModes button').forEach(b=>b.onclick=()=>{
      groupCompareMode=b.dataset.groupMode;
      updateGroupState();
    });
    $$('#groupStateButtons button').forEach(b=>b.onclick=()=>{
      groupState=b.dataset.groupState;
      if(groupCompareMode==='slider'){
        groupSliderValue={before:0,after:100}[groupState];
      }
      updateGroupState();
    });
    el.groupCompareSlider.oninput=()=>{
      groupSliderValue=+el.groupCompareSlider.value;
      updateGroupState();
    };
    const setGroupSliderFromPointer=e=>{
      const rect=groupDividerDrag?.media?.getBoundingClientRect();
      if(!rect?.width)return;
      const position=Math.max(0,Math.min(100,((e.clientX-rect.left)/rect.width)*100));
      groupSliderValue=position;
      updateGroupState();
    };
    el.groupGrid.addEventListener('pointerdown',e=>{
      const divider=e.target.closest('.group-divider');
      if(!divider || groupCompareMode!=='slider')return;
      e.preventDefault();
      e.stopPropagation();
      groupDividerDrag={pointerId:e.pointerId,divider,media:divider.closest('.group-media')};
      divider.classList.add('is-dragging');
      divider.setPointerCapture(e.pointerId);
      setGroupSliderFromPointer(e);
    });
    el.groupGrid.addEventListener('pointermove',e=>{
      if(groupDividerDrag?.pointerId!==e.pointerId)return;
      e.preventDefault();
      setGroupSliderFromPointer(e);
    });
    const finishGroupDividerDrag=e=>{
      if(groupDividerDrag?.pointerId!==e.pointerId)return;
      const {divider}=groupDividerDrag;
      groupDividerDrag=null;
      divider.classList.remove('is-dragging');
      if(divider.hasPointerCapture(e.pointerId))divider.releasePointerCapture(e.pointerId);
    };
    el.groupGrid.addEventListener('pointerup',finishGroupDividerDrag);
    el.groupGrid.addEventListener('pointercancel',finishGroupDividerDrag);
    el.groupGrid.addEventListener('keydown',e=>{
      if(!e.target.closest('.group-divider') || groupCompareMode!=='slider')return;
      const step=e.shiftKey?5:1;
      let next=groupSliderValue;
      if(e.key==='ArrowLeft')next-=step;
      else if(e.key==='ArrowRight')next+=step;
      else if(e.key==='Home')next=0;
      else if(e.key==='End')next=100;
      else return;
      e.preventDefault();
      e.stopPropagation();
      groupSliderValue=Math.max(0,Math.min(100,next));
      updateGroupState();
    });

    $$('#exhibitionViewModes button').forEach(b=>b.onclick=()=>{
      exhibitionView=b.dataset.exhibitionView;
      updateExhibitionView();
    });
    el.exhibitionCameraSlider.oninput=()=>{
      exhibitionCameraAngle=+el.exhibitionCameraSlider.value;
      updateExhibitionView();
    };
    el.exhibitionCameraResetBtn.onclick=()=>{
      exhibitionCameraAngle=0;
      updateExhibitionView();
    };
    el.exhibitionCompareBtn.onclick=()=>openExhibitionDetail('compare');
    el.exhibitionExplainBtn.onclick=()=>openExhibitionDetail('explain');
    el.exhibitionMediaBtn.onclick=()=>openExhibitionDetail('3d');
    const updateQuickDivider=()=>{
      const value=+el.exhibitionQuickSlider.value;
      el.exhibitionQuickCompare.style.setProperty('--quick-position',`${value}%`);
      el.exhibitionQuickDivider.setAttribute('aria-valuenow',String(value));
      el.exhibitionQuickDivider.classList.toggle('at-start',value===0);
      el.exhibitionQuickDivider.classList.toggle('at-end',value===100);
    };
    const setQuickSliderFromPointer=e=>{
      const rect=el.exhibitionQuickCompare.getBoundingClientRect();
      if(!rect.width)return;
      const value=Math.max(0,Math.min(100,((e.clientX-rect.left)/rect.width)*100));
      el.exhibitionQuickSlider.value=value.toFixed(1);
      updateQuickDivider();
    };
    el.exhibitionQuickDivider.addEventListener('pointerdown',e=>{
      e.preventDefault();
      e.stopPropagation();
      quickDividerDrag=e.pointerId;
      el.exhibitionQuickDivider.classList.add('is-dragging');
      el.exhibitionQuickDivider.setPointerCapture(e.pointerId);
      setQuickSliderFromPointer(e);
    });
    el.exhibitionQuickDivider.addEventListener('pointermove',e=>{
      if(quickDividerDrag!==e.pointerId)return;
      e.preventDefault();
      setQuickSliderFromPointer(e);
    });
    const finishQuickDividerDrag=e=>{
      if(quickDividerDrag!==e.pointerId)return;
      quickDividerDrag=null;
      el.exhibitionQuickDivider.classList.remove('is-dragging');
      if(el.exhibitionQuickDivider.hasPointerCapture(e.pointerId))el.exhibitionQuickDivider.releasePointerCapture(e.pointerId);
    };
    el.exhibitionQuickDivider.addEventListener('pointerup',finishQuickDividerDrag);
    el.exhibitionQuickDivider.addEventListener('pointercancel',finishQuickDividerDrag);
    el.exhibitionQuickDivider.addEventListener('keydown',e=>{
      const step=e.shiftKey?5:1;
      let next=+el.exhibitionQuickSlider.value;
      if(e.key==='ArrowLeft')next-=step;
      else if(e.key==='ArrowRight')next+=step;
      else if(e.key==='Home')next=0;
      else if(e.key==='End')next=100;
      else return;
      e.preventDefault();
      el.exhibitionQuickSlider.value=String(Math.max(0,Math.min(100,next)));
      updateQuickDivider();
    });
    $$('#exhibitionQuickModes button').forEach(button=>button.onclick=()=>updateExhibitionQuickView(button.dataset.quickView));
    $('#closeExhibitionCompare').onclick=()=>{
      el.exhibitionQuickVideo.pause();
      el.exhibitionCompareModal.classList.add('hidden');
    };
    el.exhibitionQuickDetailBtn.onclick=()=>openExhibitionDetail(exhibitionQuickView==='media'?'3d':exhibitionQuickView==='explain'?'explain':'compare');
    el.exhibitionCompareModal.onclick=e=>{
      if(e.target===el.exhibitionCompareModal){
        el.exhibitionQuickVideo.pause();
        el.exhibitionCompareModal.classList.add('hidden');
      }
    };
    el.exhibitionSpaceScene.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse' && e.button!==0)return;
      exhibitionSwipeStartX=e.clientX;
      exhibitionSwipeStartAngle=exhibitionCameraAngle;
      exhibitionRotationDrag=!!e.target.closest('.exhibition-space-card.is-active');
      exhibitionSwipeMoved=false;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    });
    el.exhibitionSpaceScene.addEventListener('pointermove',e=>{
      if(exhibitionSwipeStartX===null)return;
      const distance=e.clientX-exhibitionSwipeStartX;
      if(Math.abs(distance)>10)exhibitionSwipeMoved=true;
      if(exhibitionRotationDrag){
        exhibitionCameraAngle=Math.max(-18,Math.min(18,exhibitionSwipeStartAngle+distance/12));
        updateExhibitionView();
      }
    });
    el.exhibitionSpaceScene.addEventListener('pointerup',e=>{
      if(exhibitionSwipeStartX===null)return;
      const distance=e.clientX-exhibitionSwipeStartX;
      if(!exhibitionRotationDrag && Math.abs(distance)>45){
        exhibitionIndex=Math.max(0,Math.min(HACHISO.length-1,exhibitionIndex+(distance<0?1:-1)));
        updateExhibitionView();
      }
      exhibitionSwipeStartX=null;
      exhibitionRotationDrag=false;
      setTimeout(()=>{exhibitionSwipeMoved=false},0);
    });
    el.exhibitionSpaceScene.addEventListener('pointercancel',()=>{
      exhibitionSwipeStartX=null;
      exhibitionRotationDrag=false;
      exhibitionSwipeMoved=false;
    });
    el.exhibitionSpaceScene.addEventListener('click',e=>{
      if(exhibitionSwipeMoved || e.target.closest('.exhibition-space-card'))return;
      const card=$$('.exhibition-space-card')
        .map(node=>({node,rect:node.getBoundingClientRect()}))
        .filter(({rect})=>e.clientX>=rect.left && e.clientX<=rect.right && e.clientY>=rect.top && e.clientY<=rect.bottom)
        .sort((a,b)=>Math.abs(e.clientX-(a.rect.left+a.rect.width/2))-Math.abs(e.clientX-(b.rect.left+b.rect.width/2)))[0]?.node;
      if(!card)return;
      const index=+card.dataset.exhibitionIndex;
      if(index!==exhibitionIndex){
        exhibitionIndex=index;
        updateExhibitionView();
      } else {
        openExhibitionComparePanel();
      }
    });
    document.addEventListener('keydown',e=>{
      if(!el.exhibitionCompareModal.classList.contains('hidden')){
        if(e.key==='Escape'){
          el.exhibitionQuickVideo.pause();
          el.exhibitionCompareModal.classList.add('hidden');
        }
        return;
      }
      if(mode!=='exhibition' || exhibitionView!=='space')return;
      if(e.key==='ArrowLeft'){
        e.preventDefault();
        exhibitionIndex=Math.max(0,exhibitionIndex-1);
        updateExhibitionView();
      }
      if(e.key==='ArrowRight'){
        e.preventDefault();
        exhibitionIndex=Math.min(HACHISO.length-1,exhibitionIndex+1);
        updateExhibitionView();
      }
    });

    $('#slidePrevBtn').onclick=()=>{stopSlideshow();stepSlide(-1)};
    $('#slideNextBtn').onclick=()=>{stopSlideshow();stepSlide(1)};
    el.slidePlayBtn.onclick=()=>{slideshowPlaying?stopSlideshow():startSlideshow()};

    $$('#slideEffectModes button').forEach(b=>b.onclick=()=>{
      slideEffect=b.dataset.slideEffect;
      setSlideEffectClass();
    });

    $('#helpBtn').onclick=()=>el.helpModal.classList.remove('hidden');
    $('#closeHelp').onclick=()=>el.helpModal.classList.add('hidden');
    el.helpModal.onclick=e=>{if(e.target===el.helpModal)el.helpModal.classList.add('hidden')};
    $('#fullscreenBtn').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()};
    document.addEventListener('visibilitychange',()=>{if(document.hidden && slideshowPlaying)stopSlideshow()});
  }

  bind();
  sync();
})();
