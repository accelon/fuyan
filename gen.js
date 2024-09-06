import {entity2unicode,glob,writeChanged,nodefs, readTextContent, fromChineseNumber, unique} from "ptk/nodebundle.cjs"
await nodefs;
const rawdir="xhtml/ma/"
const files=glob(rawdir,"*.html");
const out=[],footnotes=[],refertexts=[];

const puretext_patch=content=>{
    return content.replace(/\(543\)（七六）/,'（七六）^pg543a')
    .replace('^b[（二]O^b[一）]','（二O一）')
    .replace('《中阿含》^f18（二七）','（二七）《中阿含》^f18')
    .replace('^pg574c（九二）','（九二）^pg574c')
    .replace('(^b[一九七])^f64^b[《中阿含》]','(一九七)^f64《中阿含》')
}
const mergebox=line=>{
    line=line.replace(/ \^box｛/g,'^box｛');
    line=line.replace(/^\^box｛(\d+)｝\^box｛/g,"^yy｛$1");
    line=line.replace(/\^box｛（｝\^box｛(\d+)）/g,'^yy｛（$1）')
    line=line.replace(/\^box｛（｝\^box｛([^｝]+)｝\^box｛）/g,'^yy｛（$1）')
    line=line.replace(/\^box｛\(｝\^box｛([^｝]+)｝\^box｛\)/g,'^yy｛($1)')
    line=line.replace(/｝\^box｛、/g,'、')
    line=line.replace(/、｝\^box｛/g,'、')
    line=line.replace(/\) ?｝\^box｛/g,')')
    line=line.replace(/([A-Z\d]+)([\]\.）]) ?｝\^box｛/g,'$1$2')
    line=line.replace(/([A-Z])｝\^box｛/g,'$1 ')
    line=line.replace(/^\^box｛([^｝]+)｝/g,"^yy｛$1｝");
    
    line=line.replace(/\｝\^box｛([\*「↝—⇨─＝ …＞→；~，」]+)｝\^box｛/g,"$1")
    line=line.replace(/\^box｛([一二三四五六七八九十O○])、/g,'\n^yy｛$1、')
    line=line.replace(/\^box｛（([一二三四五六七八九十O○])/g,'\n^yy｛（$1')
    line=line.replace(/(.)\^box｛([1243567890])、/,'$1\n^yy｛$2、')
    line=line.replace(/\^yy｛◎ ｝\^box｛/g,'◎◎')
    line=line.replace(/\^yy｛※ ｝\^box｛/g,'※');
    line=line.replace(/(.)\^yy/g,"$1\n^yy")
    //line=line.replace(/([！。　]+)\^box/g,"$1\n^box")
    return line
}
const sutrano_reg1=/^[　 \(（]+([一二三四五六七八九十O0○]{2,3})[）\)]([梵中＜\*\^《 〈])/g;
const sutrano_reg2=/^（(\d+)）([\*《]?)/g
const sutrano_reg3=/^經(\d+)【/g
const parseCK=(line)=>{
    line=line.replace(sutrano_reg1,(m,m1,m2)=>{
        const t="^ck#m"+fromChineseNumber(m1)+m2;
        return t;
    })
    line=line.replace(sutrano_reg2,"^ck#m$1$2")
    line=line.replace(sutrano_reg3,"^ck#m$1【");
    return line;
}
const parseY=(line)=>{
    if (!~line.indexOf('^yy'))return line;
    line=line.replace(/\^yy｛([壹貳參肆伍陸柒捌玖拾]+)、/g,'^z1｛$1、');
    line=line.replace(/\^yy｛[\(（]([一二三四五六七八九十]+)[\)）]/g,'^z3｛（$1）');
    line=line.replace(/\^yy｛([一二三四五六七八九十]+) ?、/g,'^z2｛$1、');
    line=line.replace(/\^yy｛[\(（]([1234567890１２３４５６７８９０]+)[\)）]/g,'^z5｛（$1）');
    line=line.replace(/\^yy｛第([一二三四五六七八九十]+)相/g,'^z5｛第$1相');

    line=line.replace(/\^yy｛([1234567890１２３４５６７８９０]+)[、\.]/g,'^z4｛$1、');

    line=line.replace(/\^yy｛([1234567890１２３４５６７８９０]+)）/g,'^z6｛$1、'); //only found in t26-2006-12.html
    line=line.replace(/\^yy｛\[([1234567890１２３４５６７８９０]+)\]/g,'^z6｛$1、'); //only found in t26-2006-18.html

    line=line.replace(/\^yy｛([1234567890１２３４５６７８９０]+)/g,'^z4｛$1、');

    line=line.replace(/\^yy｛[\(（]([A-ZＡ-Ｚ]+)[\)）]/g,'^z7｛（$1）');
    line=line.replace(/\^yy｛([A-ZＡ-Ｚ]+)[、 \.]/g,'^z6｛$1、');
    line=line.replace(/^([A-ZＡ-Ｚ]+)[、 \.](.+)/g,'^z6｛$1、$2');

    line=line.replace(/\^yy｛[\(（]([a-zａ-ｚ]+)[\)）]/g,'^z9｛（$1）');
    line=line.replace(/\^yy｛([a-zａ-ｚ]+)、/g,'^z8｛$1、');
    //line=line.replace(/\^y｛([])/,'');
    //line=line.replace(/\^y｛([])/,'');
    return line;
}
const gen=fn=>{
    const juan=parseInt(fn.match(/(\d+)\./)[1]);
    let content=readTextContent(rawdir+fn)
    content=content.replace(/<br \/>/g,'\n')
    content=content.replace(/<a name="_ftnref(\d+)[^>]+>/g,"^f$1")
    content=content.replace(/<div id="_ftn(\d+)[^>]+>/g,"^fn$1");

    content=content.replace(/<\/p>/g,'\n').replace(/&#xa0;/g,'');
    content=content.replace(/<style .+?<\/style>/g,'');
    content=content.replace(/<span style="font-family:標楷體; font-size:8pt; vertical-align:super">〔(\d+)〕/g,'^t$1')
    content=content.replace(/<span class="FootnoteReference"[^>]+>\[(\d+)\]<\/span>/g,"")
    content=content.replace(/<span class="PageNumber">\d+<\/span>/,'')
    content=content.replace(/<span style="font-size:10pt; background-color:#d8d8d8">\((\d+[a-d])\)/g,"^pg$1")
    content=content.replace(/<span [^>]+>\((\d+[a-d])\)<\/span>/g,"^pg$1")
    

    content=content.replace(/<span style="border:0.75pt solid[^>]+>(.+?)<\/span>/g,'^box｛$1｝');
    content=content.replace(/<span style="font-family:標楷體; text-decoration:underline">(.+?)<\/span>/g,'^u[$1]')
    content=content.replace(/<span style="font-family:標楷體; font-weight:bold">(.+?)<\/span>/g,'^b[$1]')
    
    //deal with t26-2007-43.html,t26-2007-44.html,t26-2007-45.html
    content=content.replace(/\^b\[（(\d+)）([^\]]+)\]/g,"（$1）$2");
    content=content.replace(/\^b\[（([一二三四五六七八九O0○]+)）([^\]]*)\]/g,"（$1）$2");

    content=content.replace(/<span style=".+?font-style:italic">(.+?)<\/span>/g,'^i[$1]')

    content=entity2unicode(content)
    content=content.replace(/<[^>]+>/g,'');
    content=puretext_patch(content)

    //taisho at the begining
    content=content.replace(/\n[（\(]([\da-c]{4})[\)）]/g,(m,m1)=>{
        //for m1
        if (parseInt(m1)>222) {
            return '\n('+m1+')\n';
        } else {
            '\n('+m1+')';
        }
    })


    let at=content.indexOf('\^fn1');

    out.push('^file#'+fn)
    //剝出 經論對照
    const lines=content.slice(0,at).split('\n');
    let refertext=false;
    
    for(let i=0;i<lines.length;i++) {
        lines[i]=parseY(mergebox(lines[i]));
        if (~lines[i].indexOf('經論對照')||~lines[i].indexOf('補充資料')) {
            refertexts.push('^file#'+fn);
            refertext=true;
        }
        if (lines[i].match(sutrano_reg1)
            ||lines[i].match(sutrano_reg2)
            ||lines[i].match(sutrano_reg3)) {
            refertext=false;
        }
        if (refertext) {
            refertexts.push(lines[i])
        } else {
            out.push(parseCK(lines[i]));
        }
    }
    
    footnotes.push(content.slice(at).replace(/\^fn(\d+)/g,'^fn'+juan+'.$1'));
}
//gen(files[0])
files.forEach(gen)

const printmissing=()=>{
    const outcontent=out.join('\n');
    let max=0, ck={};
    outcontent.replace(/\^ck#m(\d+)/g,(m,m1)=>{
        m1=parseInt(m1);
        ck[m1]=true;
        if (m1>max) max=m1;
    })
    const missing=[];
    for (let i=1;i<=max;i++) {
        if (!ck[i]) missing.push(i);
    }
    console.log('missing',missing.length,unique(missing))
    return outcontent;
}

const outcontent=printmissing();
writeChanged('out/ma.pgd',outcontent,true)
writeChanged('out/ma-footnotes.pgd',footnotes.join('\n'),true)
writeChanged('out/ma-refertexts.pgd',refertexts.join('\n'),true)