function log(data) {
    document.getElementById("log").innerHTML += data+"\n";
    console.log(data);
}

function find_matches(regex, str) {
    var matches = [];
    while ((m = regex.exec(str)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        
        m.forEach((match, groupIndex) => {
            matches.push(match);
        });
    }
    return matches;
}

function compile() {
    document.getElementById("log").innerHTML = "";
    log("Beginning compiling...");
    var data = document.getElementById("input").innerHTML;
    var meta = {};
    var pages = [];
    try {
        data = JSON.parse(data)
    } catch(e) {
        log("ERROR: Invalid JSON! Technical details: "+e.toString());
        return;
    }
    log("Initial JSON parse successful, moving to reading data");
    meta = data.meta;
    if (!meta) {
        log("ERROR: No meta section in JSON!");
        return;
    }
    log("Found meta section, beginning reading pages");
    pages = data.pages;
    if (!pages) {
        log("ERROR: No pages section in JSON!");
        return;
    }
    log("Found pages section, beginning compiling");

    var base_data = compile_meta(meta, pages);
    if (!base_data) {return;}
    log("Compiled meta");
    var full_data = compile_pages(meta, pages, base_data);
    if (!full_data) {return;}
    log("Compiled pages");
    var output    = finish_compiling(full_data);
    if (!output) {return;}
    log("Finished compiling");
    document.getElementById("output").innerHTML = output;
}

function compile_meta(meta, pages) {
    var safe = false;
    for (var i = 0; i<pages.length; i++) {
        if (pages[i].id==meta.start) {
            safe = true;
            break;
        }
    }
    if (!safe) {
        log("ERROR: Start page doesn't exist or start page isn't set!")
        return false;
    }
    if (!meta.title) {
        log("ERROR: No title!");
        return false
    }
    if (!meta.author) {
        log("ERROR: No author!");
        return false
    }
    return `
<!DOCTYPE html>
<html lang="en">
    <head>
        <title>${meta.title}</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width" />
        ${meta.custom_styles ? `<link rel="stylesheet" href="${meta.style}"/>` : ""}
        <link
          rel="icon"
          type="image/png"
          href="${meta.icon || "https://raw.githubusercontent.com/AverseABFun/IF.js/main/icon.png"}"
        />
    </head>
    <body>
    <main>
        <h1 class="title">${meta.title} by ${meta.author}</h1>
        <div id="game-container">
        [((pages_data))]
        </div>
    </main>
    <script type="module" src="if.js"></script>
  </body>
</html>`;
}
function compile_pages(meta, pages, meta_compiled) {
    try {
    var data = meta_compiled;
    var shouldReturnFalse = false;
    for (var i = 0; i<pages.length; i++) {
        if (pages[i].id == meta.start) {
            data = data.replace("[((pages_data))]",`<p id="${pages[i].id}" class="page show-start">
            ${(function(){var variable = subsitute_blocks(meta, pages[i].contents); if (!variable){shouldReturnFalse = true;}return variable;})()}
          </p>[((pages_data))]`);
          if (shouldReturnFalse) {
            return false;
          }
        } else {
            data = data.replace("[((pages_data))]",`<p id="${pages[i].id}" class="page">
            ${(function(){var variable = subsitute_blocks(meta, pages[i].contents); if (!variable){shouldReturnFalse = true;}return variable;})()}
          </p>[((pages_data))]`);
          if (shouldReturnFalse) {
            return false;
          }
        }
    }
    data = data.replace("[((pages_data))]",``);
    return data;
    } catch(e) {
        log(`Weird error: ${e.toString()}
        Debug it, captain!`)
    }
}
function subsitute_blocks(meta, str) {
    var output = str;
    const regex1 = /{.*?}/gm;
    const regex2 = /{{button-redirect\[.*?\],\[.*?\]}}/gm;
    const regex3 = /{{button-setvar\[.*?\],\[.*?\=.*?\],\[.*?\]}}/gm;
    const matches1 = find_matches(regex1, str);
    const matches2 = find_matches(regex2, str);
    const matches3 = find_matches(regex3, str);
    
    output = output.replaceAll("{{title}}", meta.title);
    output = output.replaceAll("{{author}}", meta.author);
    output = output.replaceAll("{{button_spacing}}", "<br><br>");

    for (var i = 0; i<matches1.length; i++) {
        output = output.replaceAll(matches2[i], `<span class="dont-break"><span class="insert-var" data-var="${matches1[i].replace("{","").replace("}","")}"></span></span>`);
    }
    for (var i = 0; i<matches2.length; i++) {
        var item = (' ' + matches2[i]).slice(1);
        item = item.replace("{{button-redirect","");
        item = item.substring(0, item.length - 2);
        item = item.split(",");
        var toPage = "";
        var innerHTML = "";
        if (item.length > 2) {
            log(`ERROR: Extra commas detected in this statement: "${matches2[i]}"! Instead of putting commas in your string, put "#comma;" and it will be replaced! (also, make sure you aren't trying to do a button-setvar statement with a button-redirect statement!)`);
            return false;
        } else if (item.length < 2) {
            log(`ERROR: Not enough commas detected in this statement: "${matches2[i]}"! Make sure you are only using "#comma;" in the strings(in the brackets)!`);
            return false;
        }
        for (var f = 0; f<item.length; f++) {
            var itemm = item[f];
            itemm.replace("#comma;",",");
            switch (f) {
                case 0:
                    toPage = itemm.replace("[","").substring(0,itemm.length-1);
                    break;
                case 1:
                    innerHTML = itemm.replace("[","").substring(0,itemm.length-1);
                    break;
            }
        }
        output = output.replaceAll(matches2[i],`<button class="change-page" data-to-page="${toPage}">${innerHTML}</button>`);
    }
    for (var i = 0; i<matches3.length; i++) {
        var item = (' ' + matches3[i]).slice(1);
        item = item.replace("{{button-setvar","");
        item = item.substring(0, item.length - 2);
        item = item.split(",");
        var toPage = "";
        var innerHTML = "";
        var variable = "";
        var value = "";
        if (item.length > 3) {
            log(`ERROR: Extra commas detected in this statement: "${matches3[i]}"! Instead of putting commas in your string, put "#comma;" and it will be replaced! (also, make sure you aren't trying to do a button-setvar statement with a button-redirect statement!)`);
            return false;
        } else if (item.length < 3) {
            log(`ERROR: Not enough commas detected in this statement: "${matches3[i]}"! Make sure you are only using "#comma;" in the strings(in the brackets)!`);
            return false;
        }
        for (var f = 0; f<item.length; f++) {
            var itemm = item[f];
            itemm.replace("#comma;",",");
            switch (f) {
                case 0:
                    toPage = itemm.replace("[","").substring(0,itemm.length-1);
                    break;
                case 1:
                    variable = itemm.split("=")[0];
                    value = itemm.split("=")[1];
                    break;
                case 2:
                    innerHTML = itemm.replace("[","").substring(0,itemm.length-1);
                    break;
            }
        }
        output = output.replaceAll(matches3[i],`<button class="change-page set-var" data-to-page="${toPage}" data-var="${variable}" data-value="${value}">${innerHTML}</button>`);
    }
    return output;
}
function finish_compiling(pages_compiled) {
    return pages_compiled;
}