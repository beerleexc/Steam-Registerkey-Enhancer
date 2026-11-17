// ==UserScript==
// @name         Steam Registerkey Enhancer
// @namespace    Steam Registerkey Enhancer
// @icon         https://raw.githubusercontent.com/beerleexc/Steam-Registerkey-Enhancer/refs/heads/main/assets/icon.svg
// @license      MIT
// @version      1.1.0
// @description  批量提交 Steam Key，查询每个 Key 对应的 Sub ID，导出激活记录。Submit Steam Key in bulk, query the Sub ID corresponding to each Key, and export the activation records.
// @author       beerlee
// @match        https://store.steampowered.com/account/registerkey*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      store.steampowered.com
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    if (window.__srkLoaded) return;
    window.__srkLoaded = true;

    /* ================= 常量 ================= */

    var URL_REDEEM = '/account/ajaxregisterkey/';

    var CFG_KEY = 'srk.cfg.v1';
    var RES_KEY = 'srk.res.v1';

    var DEF_CFG = { batch: 9, wait: 20, timeout: 20 };

    // 语言：简中/繁中 → 中文，其他任何语言 → 英文，取不到语言时默认中文
    function detectLang() {
        var cands = [];
        var m = location.search.match(/[?&]l=([a-zA-Z-]+)/);
        if (m) cands.push(m[1]);
        if (document.documentElement && document.documentElement.lang) {
            cands.push(document.documentElement.lang);
        }
        if (navigator.language) cands.push(navigator.language);

        for (var i = 0; i < cands.length; i++) {
            var s = String(cands[i] || '').toLowerCase();
            if (!s) continue;
            if (s.indexOf('zh') === 0 || s.indexOf('schinese') === 0 || s.indexOf('tchinese') === 0) return 'zh';
            return 'en';
        }
        return 'zh';
    }

    var I18N = {
        zh: {
            title: '输入产品代码，在 Steam 上激活您的产品。',
            ph: '支持批量激活、文字复制，可自动识别cdk\n默认分批9个、间隔20秒；每小时上限50次\n超限或连续错误10次暂停激活，请30分钟后重试',
            start: '开始激活',
            cont: '继续激活',
            stop: '停止',
            csvBtn: '导出CSV',
            jsonBtn: '导出JSON',
            txtBtn: '复制纯文本',
            unusedBtn: '复制未使用',
            clearBtn: '清空记录',
            ready: '准备就绪',
            sOk: '激活成功',
            sFail: '激活失败',
            sRun: '激活中',
            sWait: '等待激活',
            code: { 9: '已拥有', 13: '地区限制', 14: '无效代码', 15: '重复激活', 24: '缺少本体', 50: '充值成功', 53: '次数上限' },
            loginExpired: '登录状态失效，请重新登录',
            badResponse: function (s) { return '返回内容异常(HTTP ' + s + ')'; },
            timeout: '请求超时',
            network: '网络错误',
            other: '其他错误',
            unfinished: '上次未完成',
            restored: function (n) { return '已恢复上次的 ' + n + ' 条记录'; },
            waiting: function (l) { return '等待 ' + l + ' 秒后继续'; },
            noSession: '未获取到 sessionid，请确认当前页面已登录 Steam 商店',
            limit: function (n) { return '触发 Steam「次数上限」。建议等待约 1 小时后再点「继续激活」。剩余 ' + n + ' 个未处理。'; },
            stopped: function (n) { return '已停止，剩余 ' + n + ' 个未处理，可点「继续激活」恢复。'; },
            done: '全部处理完毕',
            stopping: '正在停止…',
            parsedNone: '没有解析到有效 Key（形如 XXXXX-XXXXX-XXXXX）',
            exported: function (fmt, saved) { return (saved ? '已导出 ' : '已复制 ') + fmt; },
            copiedPlain: function () { return '已复制纯文本'; },
            copiedUnused: function (n) { return '已复制 ' + n + ' 个未使用 Key'; },
            csvHeader: ['游戏名', 'Key', '状态', '激活时间', 'subId', '原因'],
            txtTitle: 'Steam Key 记录',
            recent: '最近记录',
            recentEmpty: '暂无激活记录',
            txtSummary: function (total, ok, fail, unused, run) {
                return '共 ' + total + ' 个 · 激活成功 ' + ok + ' · 激活失败 ' + fail +
                    ' · 等待激活 ' + unused + (run ? ' · 进行中 ' + run : '');
            },
            stat: function (total, withSub, ok, fail, run, unused, queue) {
                return '共 ' + total + ' 个 · 查到 SUB ' + withSub + ' 个 · 激活成功 ' + ok +
                    ' · 激活失败 ' + fail + (run ? ' · 进行中 ' + run : '') +
                    (unused ? ' · 等待激活 ' + unused : '') +
                    (queue ? ' · 队列 ' + queue : '');
            },
            chipTitle: '在 SteamDB 查看 sub ',
            chipBaseTitle: '需要先激活的本体 sub ',
            basePrefix: '本体 '
        },
        en: {
            title: 'Enter your product code to activate it on Steam.',
            ph: 'Batch activation and paste-to-detect supported\nBatch of 9 per run, 20s interval; 50 activations per hour\nOver the limit or 10 errors in a row: paused for 30 min',
            start: 'Activate',
            cont: 'Continue',
            stop: 'Stop',
            csvBtn: 'Export CSV',
            jsonBtn: 'Export JSON',
            txtBtn: 'Copy text',
            unusedBtn: 'Copy unused',
            clearBtn: 'Clear',
            ready: 'Ready',
            sOk: 'Activated',
            sFail: 'Failed',
            sRun: 'Running',
            sWait: 'Pending',
            code: {
                9: 'Already owned', 13: 'Region restricted', 14: 'Invalid code',
                15: 'Duplicate activation', 24: 'Base game required',
                50: 'Wallet top-up', 53: 'Too many attempts'
            },
            loginExpired: 'Session expired, please sign in again',
            badResponse: function (s) { return 'Unexpected response (HTTP ' + s + ')'; },
            timeout: 'Request timed out',
            network: 'Network error',
            other: 'Unknown error',
            unfinished: 'Interrupted last time',
            restored: function (n) { return 'Restored ' + n + ' record(s) from the last run'; },
            waiting: function (l) { return 'Waiting ' + l + 's before next batch'; },
            noSession: 'sessionid not found. Make sure you are signed in to the Steam Store.',
            limit: function (n) { return 'Steam rate limit hit. Wait about 1 hour, then click Continue. ' + n + ' key(s) left.'; },
            stopped: function (n) { return 'Stopped. ' + n + ' key(s) left; click Continue to resume.'; },
            done: 'All done',
            stopping: 'Stopping…',
            parsedNone: 'No valid key found (format XXXXX-XXXXX-XXXXX)',
            exported: function (fmt, saved) { return (saved ? 'Exported ' : 'Copied ') + fmt; },
            copiedPlain: function () { return 'Copied plain text'; },
            copiedUnused: function (n) { return 'Copied ' + n + ' unused key(s)'; },
            csvHeader: ['Game', 'Key', 'Status', 'Activated at', 'subId', 'Reason'],
            txtTitle: 'Steam Key Report',
            recent: 'Recent',
            recentEmpty: 'No activation records yet',
            txtSummary: function (total, ok, fail, unused, run) {
                return 'Total ' + total + ' · activated ' + ok + ' · failed ' + fail +
                    ' · pending ' + unused + (run ? ' · running ' + run : '');
            },
            stat: function (total, withSub, ok, fail, run, unused, queue) {
                return total + ' keys · SUB found ' + withSub + ' · activated ' + ok +
                    ' · failed ' + fail + (run ? ' · running ' + run : '') +
                    (unused ? ' · pending ' + unused : '') +
                    (queue ? ' · queue ' + queue : '');
            },
            chipTitle: 'View sub ',
            chipBaseTitle: 'Base sub required: ',
            basePrefix: 'Base '
        }
    };

    var T = I18N[detectLang()];

    // purchase_result_details 对照表
    var CODE_TEXT = T.code;

    /* ================= 小工具 ================= */

    var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; });
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function clampInt(v, min, max, dft) {
        var n = parseInt(v, 10);
        if (isNaN(n)) return dft;
        return Math.min(max, Math.max(min, n));
    }

    function cleanText(s) {
        return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    }

    function stripTags(s) {
        return cleanText(String(s == null ? '' : s).replace(/<[^>]*>/g, ' '));
    }

    // 支持 XXXXX-XXXXX-XXXXX / 无横线 / 5 段老 Key，全篇扫描（一行多个也不漏）
    function parseKeys(text) {
        var out = [], seen = {};
        var src = String(text || '').toUpperCase();
        var re = /[0-9A-Z]{5}(?:-?[0-9A-Z]{5}){1,4}/g;
        var m;
        while ((m = re.exec(src))) {
            var raw = m[0].replace(/-/g, '');
            var groups = raw.match(/.{5}/g) || [];
            if (groups.length < 3) continue;
            var key = groups.join('-');
            if (seen[key]) continue;
            seen[key] = 1;
            out.push(key);
        }
        return out;
    }

    /* ================= 配置 ================= */

    var cfg = loadCfg();

    function loadCfg() {
        try {
            var o = JSON.parse(localStorage.getItem(CFG_KEY) || '{}') || {};
            return {
                batch: clampInt(o.batch, 1, 20, DEF_CFG.batch),
                wait: clampInt(o.wait, 0, 3600, DEF_CFG.wait),
                timeout: clampInt(o.timeout, 5, 300, DEF_CFG.timeout)
            };
        } catch (e) {
            return { batch: DEF_CFG.batch, wait: DEF_CFG.wait, timeout: DEF_CFG.timeout };
        }
    }

    /* ================= 状态 ================= */

    var state = {
        sid: '',
        items: [],
        byKey: {},
        queue: [],
        running: false,
        abort: false,
        recentOpen: false,
        msg: ''
    };

    function setItem(key, patch) {
        var it = state.byKey[key];
        if (!it) {
            it = { key: key, status: 'wait', reason: '', code: 0, subId: 0, name: '', time: '' };
            state.byKey[key] = it;
            state.items.push(it);
        }
        if (patch) {
            for (var k in patch) {
                if (Object.prototype.hasOwnProperty.call(patch, k)) it[k] = patch[k];
            }
        }
        return it;
    }

    function saveResults() {
        try {
            localStorage.setItem(RES_KEY, JSON.stringify(state.items.slice(-200)));
        } catch (e) {}
    }

    function restoreResults() {
        try {
            var arr = JSON.parse(localStorage.getItem(RES_KEY) || '[]');
            if (!arr || !arr.length) return;
            for (var i = 0; i < arr.length; i++) {
                var it = arr[i];
                if (!it || !it.key) continue;
                // 只有真正提交过的 Key 才恢复成功/失败；从未提交的保持「等待激活」
                var status = 'wait';
                var reason = '';
                if (it.status === 'ok' || it.status === 'fail') {
                    status = it.status;
                    reason = it.reason || '';
                    if ((it.code || 0) === 24) reason = CODE_TEXT[24];
                } else if (it.status === 'run') {
                    status = 'fail';
                    reason = T.unfinished;
                }
                setItem(it.key, {
                    status: status,
                    reason: reason,
                    code: it.code || 0,
                    subId: it.subId || 0,
                    name: it.name || '',
                    time: status === 'wait' ? '' : (it.time || '')
                });
            }
            state.msg = T.restored(state.items.length);
        } catch (e) {}
    }

    /* ================= 网络 ================= */

    function getSessionId() {
        if (typeof window.g_sessionID === 'string' && window.g_sessionID) return window.g_sessionID;

        var m = document.cookie.match(/(?:^|;\s*)sessionid=([^;]+)/);
        if (m) return decodeURIComponent(m[1]);

        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var t = scripts[i].textContent || '';
            var m2 = t.match(/g_sessionID\s*=\s*["']([0-9a-fA-F]+)["']/);
            if (m2) return m2[1];
        }
        return '';
    }

    function postForm(url, data, timeoutSec) {
        var keys = Object.keys(data);
        var pairs = [];
        for (var i = 0; i < keys.length; i++) {
            pairs.push(encodeURIComponent(keys[i]) + '=' + encodeURIComponent(data[keys[i]]));
        }

        var opt = {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: pairs.join('&')
        };

        var timer = null;
        if (typeof AbortController !== 'undefined') {
            var ctrl = new AbortController();
            opt.signal = ctrl.signal;
            if (timeoutSec > 0) {
                timer = setTimeout(function () { ctrl.abort(); }, timeoutSec * 1000);
            }
        }

        return fetch(url, opt).then(function (res) {
            if (timer) clearTimeout(timer);
            return res.text().then(function (text) {
                return { status: res.status, ok: res.ok, text: text };
            });
        }, function (err) {
            if (timer) clearTimeout(timer);
            throw err;
        });
    }

    /* ================= 激活逻辑 ================= */

    function redeemKey(key) {
        return postForm(URL_REDEEM, { product_key: key, sessionid: state.sid }, cfg.timeout)
            .then(function (res) {
                if (res.status === 401 || res.status === 403) {
                    return { ok: false, reason: T.loginExpired };
                }
                var data = null;
                try { data = JSON.parse(res.text); } catch (e) { data = null; }
                if (!data) {
                    return { ok: false, reason: T.badResponse(res.status) };
                }
                return readRedeemResult(data);
            })
            .catch(function (err) {
                var name = err && err.name ? err.name : '';
                if (name === 'AbortError' || String(err).toLowerCase().indexOf('abort') >= 0) {
                    return { ok: false, reason: T.timeout };
                }
                return { ok: false, reason: T.network };
            });
    }

    function readRedeemResult(data) {
        var info = data && data.purchase_receipt_info ? data.purchase_receipt_info : null;
        // 只认 purchase_receipt_info.line_items[0]：地区限制等没有 line_items 的失败查不到 sub
        var li = info && info.line_items && info.line_items[0] ? info.line_items[0] : null;
        var subId = li ? (parseInt(li.packageid, 10) || 0) : 0;
        var name = li ? (li.line_item_description || '') : '';

        if (String(data.success) === '1' || data.success === true) {
            return { ok: true, subId: subId, name: name };
        }

        var code = 0;
        if (data.purchase_result_details !== undefined && data.purchase_result_details !== null) {
            code = parseInt(data.purchase_result_details, 10) || 0;
        } else if (info && info.result_detail !== undefined) {
            code = parseInt(info.result_detail, 10) || 0;
        }

        var reason = CODE_TEXT[code];
        if (!reason) {
            var msg = (info && (info.error || info.message)) || data.message || data.error || '';
            msg = stripTags(msg);
            reason = msg ? msg.slice(0, 60) : T.other;
        }

        // code 24 缺少本体：原因只写「缺少本体」，包名与本体 sub 已在行内展示
        if (code === 24) {
            reason = CODE_TEXT[24];
        }

        return { ok: false, reason: reason, code: code, subId: subId, name: name };
    }

    function countdown(sec) {
        return new Promise(function (resolve) {
            var left = Math.max(0, sec);
            if (!left) { resolve(); return; }

            function tick() {
                state.msg = left > 0 ? T.waiting(left) : '';
                statEl.textContent = statLine();
            }

            tick();

            var t = setInterval(function () {
                left -= 1;
                if (state.abort || left <= 0) {
                    clearInterval(t);
                    left = 0;
                    tick();
                    resolve();
                    return;
                }
                tick();
            }, 1000);
        });
    }

    async function startRun(keys) {
        if (state.running) return;

        state.sid = getSessionId();
        if (!state.sid) {
            state.msg = T.noSession;
            renderRedeem();
            return;
        }

        state.running = true;
        state.abort = false;
        state.msg = '';
        if (keys && keys.length) state.queue = keys.slice();
        renderRedeem();

        while (state.queue.length && !state.abort) {
            var batch = state.queue.splice(0, cfg.batch);
            for (var bi = 0; bi < batch.length; bi++) {
                setItem(batch[bi], { status: 'run', reason: '' });
            }
            renderRedeem();

            var results = await Promise.all(batch.map(function (k, i) {
                return sleep(i * 300).then(function () {
                    if (state.abort) return { skipped: true };
                    return redeemKey(k);
                });
            }));

            var limitHit = false;
            for (var ri = 0; ri < results.length; ri++) {
                var r = results[ri];
                var k = batch[ri];

                if (r.skipped) {
                    setItem(k, { status: 'wait', reason: '' });
                    state.queue.unshift(k);
                    continue;
                }
                setItem(k, {
                    status: r.ok ? 'ok' : 'fail',
                    reason: r.ok ? '' : r.reason,
                    code: r.code || 0,
                    subId: r.subId || 0,
                    name: r.name || '',
                    time: stampText()
                });
                if (!r.ok && r.code === 53) limitHit = true;
            }

            saveResults();
            renderRedeem();

            if (limitHit) {
                state.msg = T.limit(state.queue.length);
                break;
            }

            if (state.queue.length && !state.abort) {
                await countdown(cfg.wait);
            }
        }

        state.running = false;

        if (state.abort) {
            state.msg = T.stopped(state.queue.length);
        } else if (!state.queue.length && !limitHit) {
            state.msg = T.done;
        }
        renderRedeem();
    }

    /* ================= 复制 ================= */

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
            return;
        }
        legacyCopy(text);
    }

    function legacyCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
    }

    /* ================= 导出 ================= */

    function csvCell(v) {
        var s = String(v == null ? '' : v);
        if (/[",\r\n]/.test(s)) {
            s = '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    function buildCSV() {
        var header = T.csvHeader;
        var rows = [header.map(csvCell).join(',')];
        for (var i = 0; i < state.items.length; i++) {
            var it = state.items[i];
            var statusText = badgeText(it.status);
            rows.push([
                csvCell(it.name),
                csvCell(it.key),
                csvCell(statusText),
                csvCell(it.time || ''),
                csvCell(it.subId || ''),
                csvCell(it.reason || '')
            ].join(','));
        }
        // BOM 让 Excel 正确识别 UTF-8 中文
        return '\uFEFF' + rows.join('\r\n');
    }

    function buildJSON() {
        var arr = [];
        for (var i = 0; i < state.items.length; i++) {
            var it = state.items[i];
            var o = {
                name: it.name,
                key: it.key,
                status: it.status,
                statusText: badgeText(it.status),
                time: it.time || '',
                subId: it.subId || 0
            };
            if (it.status !== 'ok') o.reason = it.reason || '';
            arr.push(o);
        }
        return JSON.stringify(arr, null, 2);
    }

    // 等待中的 Key 就是「未使用」：从未提交激活（status 仍为 wait），导出时状态列标注「等待激活」
    function countStatus() {
        var c = { ok: 0, fail: 0, run: 0, unused: 0 };
        for (var i = 0; i < state.items.length; i++) {
            var it = state.items[i];
            if (it.status === 'ok') c.ok++;
            else if (it.status === 'fail') c.fail++;
            else if (it.status === 'run') c.run++;
            else c.unused++;
        }
        return c;
    }

    function stampText() {
        var d = new Date();
        function p(n) { return n < 10 ? '0' + n : '' + n; }
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
            p(d.getHours()) + ':' + p(d.getMinutes());
    }

    function buildTXT() {
        var c = countStatus();
        var lines = [];
        lines.push(T.txtTitle + '  ' + stampText());
        lines.push(T.txtSummary(state.items.length, c.ok, c.fail, c.unused, c.run));
        lines.push('');
        for (var i = 0; i < state.items.length; i++) {
            var it = state.items[i];
            var cols = [(i + 1) + '.', it.key, badgeText(it.status), it.time || ''];
            if (it.subId) cols.push('sub ' + it.subId);
            if (it.name) cols.push(it.name);
            if (it.status === 'fail' && it.reason) cols.push(it.reason);
            lines.push(cols.join('\t'));
        }
        return lines.join('\n');
    }

    function fileStamp() {
        return stampText().replace(/[: ]/g, '-');
    }

    // 不支持 Blob/download 时返回 false，由调用方退回复制
    function downloadFile(name, text, mime) {
        var a = document.createElement('a');
        if (!('download' in a) || typeof Blob === 'undefined' || typeof URL === 'undefined' ||
            !URL.createObjectURL) {
            return false;
        }
        var url = URL.createObjectURL(new Blob([text], { type: mime }));
        a.href = url;
        a.download = name;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            URL.revokeObjectURL(url);
            if (a.parentNode) a.parentNode.removeChild(a);
        }, 1000);
        return true;
    }

    /* ================= 样式 ================= */

    var CSS = [
        '#srk-root{',
        '--srk-txt:#c6d4df;--srk-dim:#8f98a0;--srk-line:rgba(255,255,255,.1);',
        '--srk-acc:#67c1f5;',
        'box-sizing:border-box;width:100%;max-width:100%;margin:0 0 20px;padding:0;',
        'background:#2a475e;color:var(--srk-txt);border-radius:2px;',
        'overflow:hidden;text-align:left;-webkit-text-size-adjust:100%;',
        'font:13px/1.55 "Motiva Sans",-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",Arial,sans-serif}',
        '#srk-root *{box-sizing:border-box}',
        '#srk-root .srk-hd{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;',
        'flex-wrap:wrap;row-gap:6px;padding:13px 14px 5px;border-bottom:1px solid var(--srk-line)}',
        '#srk-root .srk-logo{font-size:17px;font-weight:400;color:#fff;line-height:1.35}',
        '#srk-root .srk-body{padding:10px 14px 14px}',
        '#srk-root .srk-inputbox{border-radius:3px;border:1px solid transparent;',
        'background:rgba(0,0,0,.4);padding:7px 9px}',
        '#srk-root .srk-inputbox:focus-within{border-color:var(--srk-acc)}',
        '#srk-root textarea{display:block;width:100%;height:76px;overflow-y:auto;resize:none;',
        'padding:0;border:0;background:transparent;color:#fff;outline:none;',
        'font-size:16px;line-height:1.4;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;',
        '-webkit-appearance:none;appearance:none}',
        '#srk-root .srk-list{margin-top:10px;border-radius:2px;background:rgba(0,0,0,.2);',
        'max-height:48vh;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
        '#srk-root .srk-list.srk-hide{display:none}',
        '#srk-root .srk-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0 0}',
        '#srk-root .srk-actions .srk-btn{width:100%;min-width:0}',
        '#srk-root .srk-btn{display:inline-flex;align-items:center;justify-content:center;min-height:32px;',
        'padding:0 8px;border-radius:2px;border:0;color:#fff;',
        'background:#75b022;background-image:linear-gradient(to right,#75b022 0%,#588a1b 60%);',
        'font-size:13px;font-family:inherit;text-shadow:1px 1px 0 rgba(0,0,0,.25);',
        '-webkit-appearance:none;appearance:none;cursor:pointer}',
        '#srk-root .srk-btn:hover:not(:disabled){background:#8ed629;',
        'background-image:linear-gradient(to right,#8ed629 0%,#6aa621 60%);color:#fff}',
        '#srk-root .srk-btn:active:not(:disabled){',
        'background-image:linear-gradient(to right,#588a1b 0%,#75b022 60%)}',
        '#srk-root .srk-btn:disabled{opacity:.45;cursor:default;',
        'background-image:linear-gradient(to right,#75b022 0%,#588a1b 60%)}',
        '#srk-root .srk-prog{margin:14px 0 0}',
        '#srk-root .srk-bar{height:6px;border-radius:3px;background:rgba(0,0,0,.4);overflow:hidden}',
        '#srk-root .srk-bar i{display:block;height:100%;width:0;border-radius:3px;',
        'background:linear-gradient(90deg,#67c1f5,#a4d007);transition:width .25s ease}',
        '#srk-root .srk-stat{margin-top:7px;font-size:12.5px;line-height:1.6;color:var(--srk-dim);word-break:break-word}',
        '#srk-root .srk-row{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;',
        'padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.06)}',
        '#srk-root .srk-row:last-child{border-bottom:0}',
        '#srk-root .srk-idx{flex:0 0 auto;font-size:11.5px;color:var(--srk-dim);min-width:16px}',
        '#srk-root .srk-key{flex:0 0 auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;',
        'color:#ffd479;background:none;word-break:break-all}',
        '#srk-root .srk-badge{flex:0 0 auto;font-size:11.5px;color:#cfe6f5;background:none;white-space:nowrap}',
        '#srk-root .srk-badge.srk-ok{color:#b6e30a}',
        '#srk-root .srk-badge.srk-fail{color:#ff8a70}',
        '#srk-root .srk-badge.srk-run{color:#67c1f5}',
        '#srk-root .srk-badge.srk-wait{color:var(--srk-dim)}',
        '#srk-root .srk-why{flex:0 0 auto;max-width:45%;overflow:hidden;',
        'text-overflow:ellipsis;font-size:11.5px;line-height:1.5;color:#ff8a70;background:none;white-space:nowrap}',
        '#srk-root .srk-sub-name{flex:0 10 auto;max-width:150px;min-width:0;margin-left:auto;font-size:12px;',
        'color:var(--srk-txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:none}',
        '#srk-root .srk-sub-chip{flex:0 0 auto;display:inline-flex;align-items:center;min-height:24px;',
        'padding:0 10px;border-radius:2px;font-size:11.5px;',
        'border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#6fb3e0;',
        'font-family:inherit;font-weight:700;cursor:pointer;text-decoration:none;white-space:nowrap}',
        '#srk-root .srk-db-ico{width:10px;height:10px;margin-left:5px;flex:0 0 auto;opacity:.85}',
        '#srk-root a.srk-sub-chip:hover,#srk-root button.srk-sub-chip:hover{color:#fff;border-color:rgba(103,193,245,.55);',
        'background:rgba(103,193,245,.18)}',
        '#srk-root a.srk-sub-chip:active,#srk-root button.srk-sub-chip:active{background:rgba(103,193,245,.3)}',
        '#srk-root .srk-recent-btn{flex:0 0 auto;cursor:pointer;font-family:inherit;',
        '-webkit-appearance:none;appearance:none}',
        '#srk-root .srk-caret{margin-left:5px;font-size:10px;line-height:1;opacity:.8}',
        '#srk-root .srk-recent-empty{padding:9px 12px;font-size:12px;color:var(--srk-dim)}',
        // 嵌进 Steam 原生激活卡片时不再画第二层卡片
        '#srk-root.srk-embed{background:none;border-radius:0;margin:0;overflow:visible}',
        '@media (max-width:480px){',
        '#srk-root .srk-actions{grid-template-columns:repeat(2,1fr)}',
        '#srk-root .srk-row{padding:7px 7px;gap:3px}',
        '#srk-root .srk-idx{min-width:13px;font-size:11px}',
        '#srk-root .srk-key{font-size:12px}',
        '#srk-root .srk-badge{font-size:11px}',
        '#srk-root .srk-why{flex:0 1 auto;min-width:0;font-size:11px}',
        // 游戏名从 0 基准占用剩余空间：有剩则显示，没剩就省略，状态永不被挤压
        '#srk-root .srk-sub-name{flex:1 1 0%;margin-left:0;max-width:none;font-size:11.5px}',
        '#srk-root .srk-sub-chip{min-height:22px;padding:0 6px;font-size:11px}',
        '}',
        // 超窄屏：去掉序号换空间
        '@media (max-width:360px){',
        '#srk-root .srk-idx{display:none}',
        '#srk-root .srk-row{padding:7px 8px;gap:3px}',
        '}',
        '@media (min-width:481px){',
        '#srk-root .srk-hd{padding:16px 18px 6px}',
        '#srk-root .srk-logo{font-size:19px}',
        '#srk-root .srk-body{padding:12px 18px 18px}',
        '#srk-root .srk-inputbox{padding:9px 11px}',
        '#srk-root textarea{height:92px}',
        '#srk-root .srk-list{max-height:50vh}',
        '#srk-root .srk-actions{margin-top:10px;gap:7px}',
        '#srk-root .srk-btn{min-height:34px;padding:0 8px;font-size:13.5px}',
        '#srk-root .srk-row{padding:9px 12px;flex-wrap:nowrap}',
        '#srk-root .srk-key{font-size:13px}',
        '#srk-root .srk-badge{font-size:12px}',
        '#srk-root .srk-why{font-size:12px}',
        '#srk-root .srk-sub-name{font-size:12px;max-width:170px}',
        '#srk-root .srk-sub-chip{min-height:26px;font-size:12px;padding:0 10px}',
        '}',
        '@media (min-width:720px){',
        '#srk-root .srk-actions{grid-template-columns:repeat(7,1fr)}',
        '}'
    ].join('');

    /* ================= DOM ================= */

    var HTML = [
        '<div class="srk-hd">',
        '  <div><span class="srk-logo">' + esc(T.title) + '</span></div>',
        '  <button type="button" id="srk-recent-btn" class="srk-sub-chip srk-recent-btn"',
        '    aria-expanded="false" aria-controls="srk-list">' + esc(T.recent) +
        '<span class="srk-caret" id="srk-caret">&#9662;</span></button>',
        '</div>',
        '<div class="srk-body">',
        '  <div>',
        '    <div class="srk-inputbox">',
        '      <textarea id="srk-keys" rows="4" spellcheck="false" autocapitalize="characters"',
        '        placeholder="' + T.ph + '"></textarea>',
        '    </div>',
        '    <div class="srk-list" id="srk-list"></div>',
        '    <div class="srk-actions">',
        '      <button type="button" class="srk-btn" id="srk-start">' + esc(T.start) + '</button>',
        '      <button type="button" class="srk-btn" id="srk-stop" disabled>' + esc(T.stop) + '</button>',
        '      <button type="button" class="srk-btn" id="srk-csv" disabled>' + esc(T.csvBtn) + '</button>',
        '      <button type="button" class="srk-btn" id="srk-json" disabled>' + esc(T.jsonBtn) + '</button>',
        '      <button type="button" class="srk-btn" id="srk-txt" disabled>' + esc(T.txtBtn) + '</button>',
        '      <button type="button" class="srk-btn" id="srk-unused" disabled>' + esc(T.unusedBtn) + '</button>',
        '      <button type="button" class="srk-btn" id="srk-clear">' + esc(T.clearBtn) + '</button>',
        '    </div>',
        '    <div class="srk-prog"><div class="srk-bar"><i id="srk-bar"></i></div>',
        '      <div class="srk-stat" id="srk-stat">' + esc(T.ready) + '</div></div>',
        '  </div>',
        '</div>'
    ].join('\n');

    var root = document.createElement('div');
    root.id = 'srk-root';
    root.innerHTML = HTML;

    var styleEl = document.createElement('style');
    styleEl.id = 'srk-style';
    styleEl.textContent = CSS;

    var keysInput, startBtn, stopBtn, csvBtn, jsonBtn, txtBtn, unusedBtn, clearBtn, statEl, barEl, listEl;
    var recentBtn, caretEl;

    /* ================= 渲染 ================= */

    var STATUS_TEXT = { ok: T.sOk, fail: T.sFail, run: T.sRun, wait: T.sWait };

    function badgeText(status) {
        return STATUS_TEXT[status] || STATUS_TEXT.wait;
    }

    function badgeClass(status) {
        return 'srk-' + (STATUS_TEXT[status] ? status : 'wait');
    }

    function nameText(it) {
        if (!it.name) return '';
        return '<span class="srk-sub-name" title="' + esc(it.name) + '">' + esc(it.name) + '</span>';
    }

    // sub 数字：展示芯片，点击在新标签打开 SteamDB 的 sub 详情页
    // 错误码 24（缺少本体）时 Steam 只回本体包，芯片里的 id 是本体 sub，需标注
    var STEAMDB_ICON = '<svg class="srk-db-ico" viewBox="0 0 24 24" fill="currentColor"' +
        ' aria-hidden="true" focusable="false"><path d="M11.981 0C5.72 0 .581 2.231.02 5.081l6.675 1.257' +
        'c.544-.17 1.162-.244 1.8-.244l3.131-1.875c-.037-.469.244-.956.881-1.35c.9-.581 2.307-.9 3.732-.9' +
        'a8.6 8.6 0 0 1 2.812.412c2.1.713 2.569 2.082 1.069 3.057c-.956.618-2.494.937-4.013.9l-4.125 1.48' +
        'c-.037.3-.243.582-.637.845c-1.106.712-3.263.88-4.8.356c-.675-.225-1.125-.563-1.313-.9L.47 7.2' +
        'c.431.675 1.125 1.294 2.025 1.838C.938 9.938 0 11.062 0 12.28c0 1.2.9 2.307 2.419 3.206' +
        'C.9 16.37 0 17.476 0 18.675C0 21.619 5.363 24 12 24c6.619 0 12-2.381 12-5.325' +
        'c0-1.2-.9-2.306-2.419-3.188C23.1 14.588 24 13.482 24 12.282c0-1.219-.938-2.362-2.512-3.262' +
        'c1.556-.956 2.493-2.138 2.493-3.413c0-3.093-5.381-5.606-12-5.606zm4.275 2.663' +
        'c-.975.018-1.912.225-2.512.618c-1.031.675-.713 1.594.712 2.082s3.394.337 4.425-.338' +
        'c1.032-.675.713-1.594-.712-2.062a6.4 6.4 0 0 0-1.913-.282zm.057.318c1.387 0 2.493.525 2.493 1.163' +
        'c0 .637-1.106 1.162-2.493 1.162c-1.388 0-2.494-.525-2.494-1.162c0-.638 1.106-1.163 2.494-1.163' +
        'M8.493 6.45c-.3.019-.58.038-.862.075l1.707.319a2.03.94 0 1 1-1.52 1.744l-1.668-.32' +
        'c.188.17.45.32.806.45c1.2.413 2.888.282 3.75-.28s.6-1.35-.6-1.744c-.487-.169-1.068-.244-1.612-.244' +
        'zm11.944 3.113v1.743c0 2.063-3.787 3.732-8.437 3.732c-4.669 0-8.437-1.67-8.437-3.732V9.581' +
        'c2.156.994 5.137 1.613 8.418 1.613c3.3 0 6.3-.619 8.475-1.631zm0 6.487v1.65c0 2.063-3.787 3.731-8.437 3.731' +
        'c-4.669 0-8.437-1.668-8.437-3.731v-1.65c2.175.956 5.137 1.538 8.437 1.538s6.281-.582 8.438-1.538z"/></svg>';

    function subChip(it) {
        var id = parseInt(it.subId, 10) || 0;
        if (!id) return '';
        var isBase = it.code === 24;
        var url = 'https://steamdb.info/sub/' + id + '/';
        return '<a class="srk-sub-chip" href="' + esc(url) + '"' +
            ' target="_blank" rel="noopener noreferrer" title="' +
            esc(isBase ? T.chipBaseTitle + id : T.chipTitle + id) + '">' +
            (isBase ? esc(T.basePrefix) : '') + id + STEAMDB_ICON + '</a>';
    }

    function statusBlock(it) {
        if (it.status === 'fail') {
            return '<span class="srk-why">' + esc(it.reason || T.sFail) + '</span>';
        }
        return '<span class="srk-badge ' + badgeClass(it.status) + '">' + badgeText(it.status) + '</span>';
    }

    function recentHtml() {
        var html = [], n = 0;
        for (var i = state.items.length - 1; i >= 0 && n < 20; i--) {
            var it = state.items[i];
            if (it.status === 'wait') continue;
            n++;
            html.push(
                '<div class="srk-row">' +
                '<span class="srk-idx">' + n + '</span>' +
                '<code class="srk-key">' + esc(it.key) + '</code>' +
                statusBlock(it) +
                nameText(it) +
                subChip(it) +
                '</div>'
            );
        }
        return html.length
            ? html.join('')
            : '<div class="srk-recent-empty">' + esc(T.recentEmpty) + '</div>';
    }

    // 底部统计行：倒计时等只改这一行，不必整表重绘
    function statLine() {
        var c = countStatus();
        var total = state.items.length;
        var withSub = 0;
        for (var i = 0; i < total; i++) {
            if (state.items[i].subId) withSub++;
        }

        var line = T.stat(total, withSub, c.ok, c.fail, c.run, c.unused, state.queue.length);
        return line + (state.msg ? ' · ' + state.msg : '');
    }

    function renderRedeem() {
        if (state.recentOpen) {
            var scrollTop = listEl.scrollTop;
            listEl.innerHTML = recentHtml();
            listEl.scrollTop = scrollTop;
            listEl.classList.remove('srk-hide');
        } else {
            listEl.classList.add('srk-hide');
        }

        var c = countStatus();
        var total = state.items.length;
        var done = c.ok + c.fail;
        barEl.style.width = total ? Math.round(done / total * 100) + '%' : '0%';
        statEl.textContent = statLine();

        startBtn.disabled = state.running;
        stopBtn.disabled = !state.running;
        csvBtn.disabled = total === 0;
        jsonBtn.disabled = total === 0;
        txtBtn.disabled = total === 0;
        unusedBtn.disabled = total === 0 || c.unused === 0;
        clearBtn.disabled = state.running || total === 0;
        startBtn.textContent = (!state.running && state.queue.length) ? T.cont : T.start;
    }

    /* ================= 绑定 ================= */

    function bind() {
        keysInput = document.getElementById('srk-keys');
        startBtn = document.getElementById('srk-start');
        stopBtn = document.getElementById('srk-stop');
        csvBtn = document.getElementById('srk-csv');
        jsonBtn = document.getElementById('srk-json');
        txtBtn = document.getElementById('srk-txt');
        unusedBtn = document.getElementById('srk-unused');
        clearBtn = document.getElementById('srk-clear');
        statEl = document.getElementById('srk-stat');
        barEl = document.getElementById('srk-bar');
        listEl = document.getElementById('srk-list');
        recentBtn = document.getElementById('srk-recent-btn');
        caretEl = document.getElementById('srk-caret');

        recentBtn.addEventListener('click', function (e) {
            e.preventDefault();
            state.recentOpen = !state.recentOpen;
            caretEl.textContent = state.recentOpen ? '\u25B4' : '\u25BE';
            recentBtn.setAttribute('aria-expanded', state.recentOpen ? 'true' : 'false');
            renderRedeem();
        });

        startBtn.addEventListener('click', function () {
            if (state.running) return;
            if (state.queue.length) {
                startRun(state.queue.slice());
                return;
            }
            var keys = parseKeys(keysInput.value);
            if (!keys.length) {
                for (var i = 0; i < state.items.length; i++) {
                    if (state.items[i].status === 'wait') keys.push(state.items[i].key);
                }
            }
            if (!keys.length) {
                state.msg = T.parsedNone;
                renderRedeem();
                return;
            }
            startRun(keys);
        });

        stopBtn.addEventListener('click', function () {
            state.abort = true;
            state.msg = T.stopping;
            renderRedeem();
        });

        csvBtn.addEventListener('click', function () {
            if (!state.items.length) return;
            var text = buildCSV();
            var saved = downloadFile('steam-keys-' + fileStamp() + '.csv', text, 'text/csv;charset=utf-8');
            if (!saved) copyText(text);
            state.msg = T.exported('CSV', saved);
            renderRedeem();
        });

        jsonBtn.addEventListener('click', function () {
            if (!state.items.length) return;
            var text = buildJSON();
            var saved = downloadFile('steam-keys-' + fileStamp() + '.json', text, 'application/json;charset=utf-8');
            if (!saved) copyText(text);
            state.msg = T.exported('JSON', saved);
            renderRedeem();
        });

        txtBtn.addEventListener('click', function () {
            if (!state.items.length) return;
            copyText(buildTXT());
            state.msg = T.copiedPlain();
            renderRedeem();
        });

        unusedBtn.addEventListener('click', function () {
            var keys = [];
            for (var i = 0; i < state.items.length; i++) {
                if (state.items[i].status === 'wait') keys.push(state.items[i].key);
            }
            if (!keys.length) return;
            copyText(keys.join('\n'));
            state.msg = T.copiedUnused(keys.length);
            renderRedeem();
        });

        clearBtn.addEventListener('click', function () {
            if (state.running) return;
            state.items = [];
            state.byKey = {};
            state.queue = [];
            state.msg = '';
            try { localStorage.removeItem(RES_KEY); } catch (e) {}
            keysInput.value = '';
            renderRedeem();
        });
    }

    /* ================= 挂载 ================= */

    function injectStyle() {
        var head = document.head || document.documentElement;
        if (!head) return;
        head.appendChild(styleEl);
    }

    function tryMount() {
        if (document.getElementById('srk-root')) return true;

        var main = document.getElementById('main_content');
        var form = document.getElementById('registerkey_form');
        var examples = document.getElementById('registerkey_examples_text');

        if (form) {
            while (form.firstChild) form.removeChild(form.firstChild);
            root.className = 'srk-root srk-embed';
            form.appendChild(root);
            form.style.display = '';
        } else if (examples && examples.parentNode) {
            examples.parentNode.insertBefore(root, examples);
        } else {
            var host = (main && main.querySelector('.leftcol')) || main || document.body;
            host.insertBefore(root, host.firstChild);
        }

        if (examples) examples.style.display = 'none';
        return true;
    }

    injectStyle();

    var tries = 0;
    (function mountLoop() {
        if (tryMount()) {
            bind();
            restoreResults();
            renderRedeem();
            return;
        }
        tries += 1;
        if (tries < 60) setTimeout(mountLoop, 500);
    })();

})();
