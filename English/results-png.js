"use strict";
/* Download the displayed results without sending student data to an image service. */
(() => {
  const WIDTH = 1600;
  const PADDING = 56;
  const MAX_HEIGHT = 12000;
  const LINE_HEIGHT = 28;
  const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
  const text = element => clean(element?.textContent);

  function wrap(context, value, width) {
    const lines = [];
    for (const paragraph of String(value || "—").split(/\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate=line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width <= width) {line=candidate;continue;}
        if (line) {lines.push(line);line="";}
        for (const character of word) {
          if (context.measureText(line+character).width > width && line) {lines.push(line);line="";}
          line+=character;
        }
      }
      lines.push(line.trim() || " ");
    }
    return lines;
  }

  function tableData(table) {
    const headers = Array.from(table.querySelectorAll("thead th")).map(text);
    const columns = headers.map((label, index) => ({label,index})).filter(item => item.label);
    const rows = Array.from(table.querySelectorAll("tbody tr"))
      .filter(row => row.querySelectorAll("td").length >= headers.length)
      .map(row => columns.map(column => {
        const cell = row.cells[column.index].cloneNode(true);
        cell.querySelectorAll("button").forEach(button => button.remove());
        cell.querySelectorAll("br").forEach(br => br.replaceWith(" · "));
        return text(cell);
      }));
    return {headers:columns.map(column => column.label),rows};
  }

  function metadata() {
    const classId = document.querySelector("#classIdInput")?.value.trim();
    const select = document.querySelector("#examSelect, #testSelect");
    const assessment = select?.selectedOptions[0]?.textContent || "All assessments";
    const student = document.querySelector("#studentInput")?.value.trim();
    return [classId && `Class: ${classId}`,assessment,student && `Student filter: ${student}`].filter(Boolean).join("  ·  ");
  }

  function sections(details) {
    if (!details) {
      const table = document.querySelector("#resultsBody")?.closest("table");
      const data = table && tableData(table);
      if (!data?.rows.length) throw new Error("Load results before downloading a PNG.");
      return [{type:"table",...data}];
    }
    const content = document.querySelector("#detailsContent");
    if (!content?.textContent.trim()) throw new Error("Open a submission before downloading a PNG.");
    const blocks = [];
    function visit(element) {
      if (element.matches("button, script, .hidden, [hidden]")) return;
      if (element.matches("input, select, textarea")) {
        const label=element.getAttribute("aria-label") || text(element.closest("label")?.querySelector("span"));
        blocks.push({type:"text",text:`${label || "Value"}: ${element.value || "—"}`});
        return;
      }
      if (element.matches("label") && element.querySelector("input,select,textarea")) {
        const input=element.querySelector("input,select,textarea");
        blocks.push({type:"text",text:`${input.getAttribute("aria-label") || text(element.querySelector("span")) || "Value"}: ${input.value || "—"}`});
        return;
      }
      if (element.matches("table")) { blocks.push({type:"table",...tableData(element)}); return; }
      if (element.matches("h1,h2,h3,h4")) { blocks.push({type:"heading",text:text(element)}); return; }
      if (element.matches(".detail-box")) { blocks.push({type:"text",text:Array.from(element.children).map(text).join(": ")}); return; }
      if (!element.children.length || element.matches("p,li,.test-detail-answer")) {
        if (text(element)) blocks.push({type:"text",text:text(element)});
        return;
      }
      for (const child of element.children) visit(child);
    }
    for (const child of content.children) visit(child);
    return blocks;
  }

  async function renderReport({title,subtitle,blocks}) {
    if (document.fonts?.ready) await document.fonts.ready;
    const measure = document.createElement("canvas").getContext("2d");
    if (!measure) throw new Error("This browser cannot create PNG images.");
    measure.font = "22px Arial, sans-serif";
    const pages = [];
    let operations = [], y = 210;
    const finish = () => { pages.push({operations,height:Math.ceil(y+65)}); operations=[]; y=210; };
    const reserve = height => {if(y+height>MAX_HEIGHT-65 && operations.length) finish();};
    for (const block of blocks) {
      if (block.type !== "table") {
        const lines=wrap(measure,block.text,WIDTH-PADDING*2);
        for (let i=0;i<lines.length;i+=100) {
          const group=lines.slice(i,i+100);const height=group.length*LINE_HEIGHT+20;
          reserve(height);operations.push({type:block.type,lines:group,y});y+=height;
        }
        continue;
      }
      const count=block.headers.length;
      if (!count) continue;
      const widths=block.headers.map((label,index)=> {
        if(count<6) return (WIDTH-PADDING*2)/count;
        const weights=block.headers.map(h=>/student|exam|test|parts|pages|answer|expected/i.test(h)?2:1);
        return (WIDTH-PADDING*2)*weights[index]/weights.reduce((a,b)=>a+b,0);
      });
      const rowOperation=(cells,header=false)=> {
        const lines=cells.map((cell,index)=>wrap(measure,cell,widths[index]-24));
        const height=Math.max(...lines.map(row=>row.length))*LINE_HEIGHT+24;
        return {type:"row",lines,widths,height,header};
      };
      const header=rowOperation(block.headers,true);
      const addHeader=()=>{operations.push({...header,y});y+=header.height;};
      reserve(header.height+60);addHeader();
      block.rows.forEach((cells,index)=> {
        const row=rowOperation(cells);
        // Keep very long feedback in bounded fragments, repeating table headers.
        const lineCount=Math.max(...row.lines.map(lines=>lines.length));
        for(let offset=0;offset<lineCount;offset+=150) {
          const lines=row.lines.map(lines=>lines.slice(offset,offset+150));
          const height=Math.max(...lines.map(lines=>lines.length))*LINE_HEIGHT+24;
          if(y+height>MAX_HEIGHT-65){finish();addHeader();}
          operations.push({...row,lines,height,y,alternate:index%2===1});y+=height;
        }
      });
      y+=24;
    }
    finish();
    return pages.map((page,pageIndex)=> {
      const canvas=document.createElement("canvas");canvas.width=WIDTH;canvas.height=page.height;
      const ctx=canvas.getContext("2d");
      ctx.fillStyle="#ffffff";ctx.fillRect(0,0,WIDTH,canvas.height);
      ctx.fillStyle="#24365f";ctx.fillRect(0,0,WIDTH,12);ctx.fillStyle="#f8bc3c";ctx.fillRect(0,12,WIDTH,4);ctx.fillStyle="#24365f";
      ctx.font="bold 24px Arial, sans-serif";ctx.fillText("UNIDAD EDUCATIVA PARTICULAR LEV VIGOTSKY",PADDING,63);
      ctx.font="bold 36px Arial, sans-serif";ctx.fillText(title,PADDING,112);
      ctx.font="20px Arial, sans-serif";ctx.fillStyle="#535b6b";
      wrap(ctx,subtitle,WIDTH-PADDING*2).slice(0,2).forEach((line,index)=>ctx.fillText(line,PADDING,150+index*26));
      for(const op of page.operations) {
        if(op.type!=="row") {
          ctx.fillStyle="#24365f";ctx.font=op.type==="heading"?"bold 25px Arial, sans-serif":"22px Arial, sans-serif";
          op.lines.forEach((line,index)=>ctx.fillText(line,PADDING,op.y+24+index*LINE_HEIGHT));continue;
        }
        let x=PADDING;
        ctx.fillStyle=op.header?"#24365f":op.alternate?"#eef1f7":"#ffffff";
        ctx.fillRect(x,op.y,WIDTH-PADDING*2,op.height);
        ctx.fillStyle=op.header?"#ffffff":"#24365f";ctx.font=op.header?"bold 22px Arial, sans-serif":"22px Arial, sans-serif";
        op.lines.forEach((lines,column)=>{lines.forEach((line,index)=>ctx.fillText(line,x+12,op.y+32+index*LINE_HEIGHT));x+=op.widths[column];});
        ctx.strokeStyle="#e6e3da";ctx.beginPath();ctx.moveTo(PADDING,op.y+op.height);ctx.lineTo(WIDTH-PADDING,op.y+op.height);ctx.stroke();
      }
      ctx.font="18px Arial, sans-serif";ctx.fillStyle="#535b6b";
      ctx.fillText(`Generated ${new Date().toLocaleString()} · ${pageIndex+1}/${pages.length}`,PADDING,page.height-24);
      return canvas;
    });
  }

  async function download(button,details) {
    const label=button.textContent;button.disabled=true;button.textContent="Creating PNG…";
    try {
      const isTest=!!document.querySelector("#testSelect");
      const canvases=await renderReport({title:details?(isTest?"Test submission details":"Exam submission details"):(isTest?"Test results":"Exam results"),subtitle:metadata(),blocks:sections(details)});
      const classId=(document.querySelector("#classIdInput")?.value || "class").replace(/[^a-z0-9_-]/gi,"-");
      for(let i=0;i<canvases.length;i++) {
        const blob=await new Promise((resolve,reject)=>canvases[i].toBlob(blob=>blob?resolve(blob):reject(new Error("Could not create PNG. Try a smaller student filter.")),"image/png"));
        const url=URL.createObjectURL(blob);const link=document.createElement("a");
        link.href=url;link.download=`ueplv-${isTest?"test":"exam"}-${details?"details":"results"}-${classId}${canvases.length>1?`-${i+1}`:""}.png`;
        document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      }
    } catch(error) {
      const toast=document.querySelector("#toast");
      if(toast){toast.textContent=error.message || "Could not download PNG.";toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),5000);}
    } finally {button.disabled=false;button.textContent=label;}
  }
  window.UEPLVResultsPng = {download};
  document.querySelector("#downloadPngBtn")?.addEventListener("click",event=>download(event.currentTarget,false));
  document.querySelector("#downloadDetailsPngBtn")?.addEventListener("click",event=>download(event.currentTarget,true));
})();
