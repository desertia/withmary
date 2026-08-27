const languagePreferenceKey='preferredLanguage';
const languageRoutes={ko:'/',en:'/en/',fr:'/fr/',es:'/es/'};
const isSupportedLanguage=language=>Object.prototype.hasOwnProperty.call(languageRoutes,language);
const languageSuggestionDismissedKey='languageSuggestionDismissed';
const koreanPagePaths=new Set([
  '/',
  '/index.html',
  '/guide.html',
  '/joyful.html',
  '/luminous.html',
  '/sorrowful.html',
  '/glorious.html',
  '/support.html',
  '/privacy.html',
  '/terms.html'
]);
const languageSuggestions={
  en:{
    message:'Would you like to view With Mary in English?',
    action:'View in English',
    regionLabel:'Language suggestion',
    closeLabel:'Close language suggestion'
  },
  fr:{
    message:'Préférez-vous consulter With Mary en français ?',
    action:'Voir en français',
    regionLabel:'Suggestion de langue',
    closeLabel:'Fermer la suggestion de langue'
  },
  es:{
    message:'¿Prefieres ver With Mary en español?',
    action:'Ver en español',
    regionLabel:'Sugerencia de idioma',
    closeLabel:'Cerrar sugerencia de idioma'
  }
};

const saveLanguagePreference=language=>{
  if(!isSupportedLanguage(language))return;
  try{localStorage.setItem(languagePreferenceKey,language)}catch{}
};

const getStoredLanguageValue=key=>{
  try{return localStorage.getItem(key)}catch{return null}
};

const getPrimaryBrowserLanguage=()=>{
  const candidates=[...(Array.isArray(navigator.languages)?navigator.languages:[]),navigator.language];
  const primary=candidates.find(language=>typeof language==='string'&&language.trim());
  return primary?primary.trim().toLowerCase().split(/[-_]/)[0]:'';
};

const showLanguageSuggestion=header=>{
  if(!koreanPagePaths.has(window.location.pathname))return;

  const language=getPrimaryBrowserLanguage();
  const suggestion=languageSuggestions[language];
  if(!suggestion)return;
  if(isSupportedLanguage(getStoredLanguageValue(languagePreferenceKey)))return;
  if(getStoredLanguageValue(languageSuggestionDismissedKey)===language)return;

  const existingLanguageLink=document.querySelector(`.language-switcher a[hreflang="${language}"]`);
  if(!existingLanguageLink)return;

  const banner=document.createElement('aside');
  banner.className='language-suggestion-banner';
  banner.setAttribute('aria-label',suggestion.regionLabel);
  banner.innerHTML=`
    <div class="container language-suggestion-inner">
      <p>${suggestion.message}</p>
      <div class="language-suggestion-actions">
        <a class="language-suggestion-link" href="${existingLanguageLink.getAttribute('href')}" hreflang="${language}">${suggestion.action}</a>
        <button class="language-suggestion-close" type="button" aria-label="${suggestion.closeLabel}"><span aria-hidden="true">×</span></button>
      </div>
    </div>`;

  const suggestionLink=banner.querySelector('.language-suggestion-link');
  const closeButton=banner.querySelector('.language-suggestion-close');
  suggestionLink.addEventListener('click',()=>saveLanguagePreference(language));
  closeButton.addEventListener('click',()=>{
    try{localStorage.setItem(languageSuggestionDismissedKey,language)}catch{}
    banner.remove();
    document.body.classList.remove('language-suggestion-visible','language-suggestion-standalone');
  });

  document.body.classList.add('language-suggestion-visible');
  if(header){header.insertAdjacentElement('afterend',banner)}
  else{
    banner.classList.add('language-suggestion-banner--standalone');
    document.body.classList.add('language-suggestion-standalone');
    document.body.prepend(banner);
  }
};

document.querySelectorAll('.language-switcher a[hreflang]').forEach(link=>{
  link.addEventListener('click',()=>saveLanguagePreference(link.hreflang));
});

const closeLanguageDropdown=dropdown=>{
  const toggle=dropdown.querySelector('.language-dropdown-toggle');
  const menu=dropdown.querySelector('.language-dropdown-menu');
  if(!toggle||!menu)return;
  toggle.setAttribute('aria-expanded','false');
  menu.hidden=true;
};

document.querySelectorAll('.language-dropdown').forEach(dropdown=>{
  const toggle=dropdown.querySelector('.language-dropdown-toggle');
  const menu=dropdown.querySelector('.language-dropdown-menu');
  if(!toggle||!menu)return;

  toggle.addEventListener('click',()=>{
    const willOpen=toggle.getAttribute('aria-expanded')!=='true';
    document.querySelectorAll('.language-dropdown').forEach(closeLanguageDropdown);
    toggle.setAttribute('aria-expanded',String(willOpen));
    menu.hidden=!willOpen;
  });

  toggle.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    event.preventDefault();
    toggle.click();
  });

  menu.addEventListener('click',event=>{
    if(event.target.closest('a'))closeLanguageDropdown(dropdown);
  });
});

document.addEventListener('click',event=>{
  document.querySelectorAll('.language-dropdown').forEach(dropdown=>{
    if(!dropdown.contains(event.target))closeLanguageDropdown(dropdown);
  });
});

document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  document.querySelectorAll('.language-dropdown').forEach(dropdown=>{
    const toggle=dropdown.querySelector('.language-dropdown-toggle');
    if(toggle?.getAttribute('aria-expanded')==='true'){
      closeLanguageDropdown(dropdown);
      toggle.focus();
    }
  });
});

const header=document.querySelector('.site-header');
showLanguageSuggestion(header);
const revealItems=document.querySelectorAll('.reveal');
const updateHeader=()=>header?.classList.toggle('scrolled',window.scrollY>18);
updateHeader();window.addEventListener('scroll',updateHeader,{passive:true});

if('IntersectionObserver'in window){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.1});
  revealItems.forEach(item=>observer.observe(item));
}else{revealItems.forEach(item=>item.classList.add('visible'))}

const carousel=document.querySelector('[data-carousel]');
if(carousel){
  const viewport=carousel.querySelector('.preview-viewport');
  const track=carousel.querySelector('.preview-track');
  const cards=[...carousel.querySelectorAll('.preview-card')];
  const dots=[...carousel.querySelectorAll('.dot')];
  const prev=carousel.querySelector('.prev');
  const next=carousel.querySelector('.next');
  let index=0,startX=0,dragX=0,isDragging=false;

  const visibleCount=()=>window.innerWidth<=620?1:window.innerWidth<=1180?3:4;
  const maxIndex=()=>Math.max(0,cards.length-visibleCount());
  const step=()=>cards[0].getBoundingClientRect().width+parseFloat(getComputedStyle(track).gap||0);
  const render=()=>{
    index=Math.min(Math.max(index,0),maxIndex());
    track.style.transform=`translate3d(${-index*step()}px,0,0)`;
    dots.forEach((dot,i)=>dot.classList.toggle('active',i===index));
    prev.disabled=index===0;next.disabled=index===maxIndex();
  };
  prev.addEventListener('click',()=>{index--;render()});
  next.addEventListener('click',()=>{index++;render()});
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>{index=Math.min(i,maxIndex());render()}));
  viewport.addEventListener('pointerdown',e=>{isDragging=true;startX=e.clientX;dragX=0;viewport.setPointerCapture(e.pointerId);track.style.transition='none'});
  viewport.addEventListener('pointermove',e=>{if(!isDragging)return;dragX=e.clientX-startX;track.style.transform=`translate3d(${(-index*step())+dragX}px,0,0)`});
  const endDrag=()=>{if(!isDragging)return;isDragging=false;track.style.transition='';if(Math.abs(dragX)>45)index+=dragX<0?1:-1;render()};
  viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);viewport.addEventListener('pointerleave',endDrag);
  window.addEventListener('resize',render,{passive:true});render();
}

const heroStage=document.querySelector('.hero-device-stage');
if(heroStage&&window.matchMedia('(pointer:fine)').matches&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const heroDevices=[...heroStage.querySelectorAll('.hero-device')];
  heroStage.addEventListener('pointermove',event=>{
    const rect=heroStage.getBoundingClientRect();
    const x=(event.clientX-rect.left)/rect.width-.5;
    const y=(event.clientY-rect.top)/rect.height-.5;
    heroDevices.forEach((device,i)=>{
      const depth=i===1?10:5;
      device.style.marginLeft=`${x*depth}px`;
      device.style.marginTop=`${y*depth}px`;
    });
  });
  heroStage.addEventListener('pointerleave',()=>heroDevices.forEach(device=>{device.style.marginLeft='';device.style.marginTop=''}));
}
