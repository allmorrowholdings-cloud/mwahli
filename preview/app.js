
document.querySelectorAll('.feelings button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    btn.parentElement.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
  });
});
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
  const id=a.getAttribute('href');
  if(id && id.length>1){
    const el=document.querySelector(id);
    if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'});}
  }
}));
