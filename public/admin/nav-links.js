(function(root){
  function duplicate(nav,origin='http://localhost') {
    const seen=new Map();
    for(const [index,link] of nav.entries()) {
      let value=String(link.url||'').trim();
      if(!value||value==='#')value='/'+String(link.label||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
      let key=value;
      try {
        const url=new URL(value,origin+'/');
        let path=url.pathname;
        if(url.origin===new URL(origin).origin)path=path.replace(/^\/(en|ms|zh)(?=\/|$)/,'');
        path=path.replace(/\/+$/,'')||'/';
        key=url.origin===new URL(origin).origin?path+url.hash:url.origin+path+url.search+url.hash;
      } catch { /* Compare other link formats as entered. */ }
      if(seen.has(key)) {
        const first=seen.get(key);
        return {indexes:[first,index],message:'Duplicate header link: “'+nav[first].label+'” and “'+link.label+'” both point to '+value+'. Use a different link or remove one item.'};
      }
      seen.set(key,index);
    }
    return null;
  }
  function headerPages(nav,pages,origin='http://localhost') {
    const result=[],seen=new Set();
    for(const link of nav) {
      try {
        if(!link.url)continue;
        const url=new URL(link.url,origin+'/');
        if(url.origin!==new URL(origin).origin)continue;
        const slug=url.pathname.replace(/^\/(en|ms|zh)(?=\/|$)/,'').replace(/^\/|\/$/g,'')||'home';
        const page=pages.find(page=>page.slug===slug);
        if(page&&!seen.has(slug)){result.push(page);seen.add(slug);}
      } catch { /* Invalid links cannot add pages to the editor. */ }
    }
    return result;
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={duplicate,headerPages};else root.NavLinks={duplicate,headerPages};
})(typeof window!=='undefined'?window:this);
