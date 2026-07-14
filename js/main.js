const header=document.querySelector('.site-header');
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
