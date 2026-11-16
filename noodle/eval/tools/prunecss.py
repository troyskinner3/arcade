# Remove stylesheet rules for things that no longer exist in noodle/index.html.
# A selector is dead when one of its class names or ids appears nowhere outside the stylesheet (markup and script, as a whole word),
# or when it names an element type that is used nowhere. A rule goes when every selector in it is dead; otherwise only the dead selectors go.
# Usage: python3 prunecss.py <file> [--dry]     Check the result with css_shots.js + shotdiff.py: tests cannot see styling.
import re, sys
p = sys.argv[1]; dry = '--dry' in sys.argv
html = open(p).read()
m = max(re.finditer(r'<style>\n(.*?)</style>', html, re.S), key=lambda m: len(m.group(1)))
css = m.group(1); rest = html[:m.start(1)] + html[m.end(1):]
words = set(re.findall(r'[A-Za-z_][\w-]*', rest))
# class names can be built in script from pieces ("nx-"+kind): keep any class whose prefix up to a dash is concatenated somewhere
built = set(re.findall(r"['\"`]([A-Za-z][\w]*-)['\"`]?\s*\+", rest)) | set(re.findall(r"([A-Za-z][\w]*-)\$\{", rest))
tags_used = set(t.lower() for t in re.findall(r'<([a-zA-Z][a-zA-Z0-9]*)', rest)) | set(re.findall(r"createElement(?:NS)?\([^)]*?['\"](\w+)['\"]\)", rest)) | {'html', 'body', 'head'}
dead_names = set()
def alive(sel):
    s = re.sub(r'\[[^\]]*\]', '', sel)                      # attribute selectors don't decide
    s = re.sub(r'::?[\w-]+(\([^)]*\))?', lambda mm: mm.group(0) if mm.group(0).startswith((':not(', ':is(', ':where(', ':has(')) else '', s)
    for kind, name in re.findall(r'([.#])(-?[A-Za-z_][\w-]*)', s):
        if name in words: continue
        if any(name.startswith(b) for b in built): continue
        dead_names.add(kind + name); return False
    for t in re.findall(r'(?:^|[\s>+~,(])([a-zA-Z][a-zA-Z0-9]*)(?=[\s>+~.#:\[,)]|$)', s):
        if t.lower() not in tags_used and t.lower() not in ('not', 'is', 'where', 'has', 'root'):
            dead_names.add(t); return False
    return True
removed = []
def block(text):            # text = a run of rules (top level or inside @media); returns the pruned text
    out = []; i = 0; n = len(text)
    while i < n:
        j = text.find('{', i)
        if j < 0: out.append(text[i:]); break
        # comments before the selector stay with it
        pre = text[i:j]
        depth = 1; k = j + 1
        while k < n and depth:
            c = text[k]
            if c == '{': depth += 1
            elif c == '}': depth -= 1
            k += 1
        body = text[j + 1:k - 1]
        lead = re.match(r'(\s*(/\*.*?\*/\s*)*)', pre, re.S).group(1); sel = pre[len(lead):]
        if sel.strip().startswith('@'):
            if re.match(r'\s*@(media|supports)', sel):
                inner = block(body)
                if inner.strip(): out.append(lead + sel + '{' + inner + '}')
                else: removed.append(sel.strip() + '{…}'); out.append(lead if lead.strip() else '')
            else: out.append(pre + '{' + body + '}')          # @keyframes, @font-face: keep
        else:
            parts = [x for x in re.split(r',(?![^(]*\))', sel)]
            keep = [x for x in parts if alive(x.strip())]
            if not keep: removed.append(sel.strip()); out.append(lead if lead.strip() else '')
            else:
                if len(keep) < len(parts): removed.append('(part) ' + ','.join(x.strip() for x in parts if x not in keep))
                out.append(lead + ','.join(keep) + '{' + body + '}')
        i = k
    return ''.join(out)
new = block(css)
new = re.sub(r'\n[ \t]*\n(\s*\n)+', '\n\n', new)
print('rules or selectors removed:', len(removed)); print('names with no use:', len(dead_names))
print(' '.join(sorted(dead_names)))
print('stylesheet', len(css), '->', len(new))
if not dry: open(p, 'w').write(html[:m.start(1)] + new + html[m.end(1):])
