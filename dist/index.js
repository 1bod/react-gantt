import { forwardRef as e, useCallback as t, useEffect as n, useImperativeHandle as r, useMemo as i, useRef as a, useState as o } from "react";
import { DateTime as s } from "luxon";
import { jsx as c, jsxs as l } from "react/jsx-runtime";
//#region src/core/apply.ts
function u(e, t) {
	let n = t.start.toMillis(), r = t.end.toMillis(), i = (e) => t.rowId === void 0 ? {
		...e,
		start: n,
		end: r
	} : {
		...e,
		start: n,
		end: r,
		rowId: t.rowId
	}, a = null, o = [], s = t.position;
	for (let n of e) {
		if (n.id === t.id) {
			a = i(n), s || o.push(a);
			continue;
		}
		let e = n.children;
		if (!e) {
			o.push(n);
			continue;
		}
		let r = !1, c = [];
		for (let n of e) {
			if (n.id === t.id) {
				a = i(n), r = !0, s || c.push(a);
				continue;
			}
			c.push(n);
		}
		o.push(r ? {
			...n,
			children: c
		} : n);
	}
	if (!a) return e.slice();
	if (!s) return o;
	if (s.parentId === null) {
		let e = Math.min(Math.max(s.index, 0), o.length);
		return o.splice(e, 0, a), o;
	}
	let c = a;
	return o.map((e) => {
		if (e.id !== s.parentId) return e;
		let t = (e.children ?? []).slice(), n = Math.min(Math.max(s.index, 0), t.length);
		return t.splice(n, 0, c), {
			...e,
			children: t
		};
	});
}
function d(e, t) {
	return t.reduce((e, t) => u(e, t), e.slice());
}
//#endregion
//#region src/core/time.ts
var f = 6e4, p = 60 * f, m = 24 * p, h = 7 * m, g = {
	hour: p,
	day: m,
	week: h,
	month: 30.4375 * m
};
function _(e) {
	if (e instanceof Date) return e.getTime();
	if (typeof e == "number") return e;
	if (typeof e == "string") {
		let t = s.fromISO(e);
		if (!t.isValid) throw Error(`react-gantt: invalid ISO date "${e}"`);
		return t.toMillis();
	}
	if (s.isDateTime(e)) return e.toMillis();
	throw Error("react-gantt: unsupported date input");
}
function v(e, t = "local") {
	return s.fromMillis(e, { zone: t });
}
function ee(e, t, n, r) {
	return {
		startMs: e,
		endMs: t,
		pxPerMs: r / g[n]
	};
}
function y(e, t) {
	return (t - e.startMs) * e.pxPerMs;
}
function te(e, t) {
	return e.startMs + t / e.pxPerMs;
}
function ne(e) {
	return y(e, e.endMs);
}
var re = {
	hour: "hour",
	day: "day",
	week: "week",
	month: "month"
};
function ie(e, t, n = "local", r = Date.now()) {
	let i = Infinity, a = -Infinity, o = (e) => {
		i = Math.min(i, _(e.start)), a = Math.max(a, _(e.end)), e.children?.forEach(o);
	};
	e.forEach(o), (!Number.isFinite(i) || !Number.isFinite(a)) && (i = r, a = r + 7 * g[t]);
	let c = re[t];
	return {
		startMs: s.fromMillis(i, { zone: n }).startOf(c).minus({ [c]: 1 }).toMillis(),
		endMs: s.fromMillis(a, { zone: n }).startOf(c).plus({ [c]: 2 }).toMillis()
	};
}
function ae(e, t, n) {
	return Math.min(Math.max(e, t), n);
}
//#endregion
//#region src/core/closed.ts
function oe(e) {
	let t = [];
	for (let n of e) {
		let e = _(n.start), r = _(n.end);
		r > e && t.push({
			start: e,
			end: r
		});
	}
	return t;
}
function se(e, t, n) {
	let r = [];
	for (let i of e) {
		let e = Math.max(i.start, t), a = Math.min(i.end, n);
		a > e && r.push({
			start: e,
			end: a
		});
	}
	return r;
}
//#endregion
//#region src/core/links.ts
var b = (e) => Math.floor(e) + .5, ce = 4;
function le(e, t, n = "finish_start", r = 8) {
	let i = b(e.y + e.height / 2), a = b(t.y + t.height / 2), o = b(n === "start_start" ? e.x : e.x + e.width), s = b(n === "finish_finish" ? t.x + t.width : t.x), c;
	if (n === "start_start" || n === "finish_finish") {
		let e = n === "start_start" ? Math.min(o, s) - r : Math.max(o, s) + r;
		c = [
			[o, i],
			[e, i],
			[e, a],
			[s, a]
		];
	} else if (s - o >= 2 * r) c = [
		[o, i],
		[o + r, i],
		[o + r, a],
		[s, a]
	];
	else {
		let n = b(i === a ? Math.max(e.y + e.height, t.y + t.height) + r / 2 : (i + a) / 2);
		c = [
			[o, i],
			[o + r, i],
			[o + r, n],
			[s - r, n],
			[s - r, a],
			[s, a]
		];
	}
	let l = c.filter((e, t) => t === 0 || e[0] !== c[t - 1][0] || e[1] !== c[t - 1][1]).map(([e, t], n) => `${n === 0 ? "M" : "L"}${e} ${t}`).join(" "), u = n === "finish_finish" ? s + ce : s - ce;
	return {
		path: l,
		arrow: `M${s} ${a} L${u} ${a - ce * .75} L${u} ${a + ce * .75} Z`
	};
}
function ue(e, t, n) {
	return t === "none" ? [] : t === "all" ? e.slice() : e.filter((e) => n.has(e.from) || n.has(e.to));
}
//#endregion
//#region src/core/snap.ts
function de(e) {
	switch (e) {
		case "minute": return f;
		case "hour": return p;
		case "day": return m;
		case "none": return 0;
		default: return e > 0 ? e : 0;
	}
}
function fe(e, t, n) {
	return e - t < n - e ? t : n;
}
function pe(e, t, n = "local") {
	if (t === "none") return e;
	if (t === "hour" || t === "day") {
		let r = s.fromMillis(e, { zone: n }).startOf(t), i = r.plus({ [t]: 1 });
		return fe(e, r.toMillis(), i.toMillis());
	}
	let r = de(t);
	return r <= 0 ? e : Math.round(e / r) * r;
}
function me(e, t, n) {
	let r = null;
	for (let i of t) {
		let t = Math.abs(i - e);
		t <= n && (r === null || t < r.distance) && (r = {
			edge: i,
			distance: t
		});
	}
	return r;
}
function x(e, t) {
	let n = t.edgeThresholdMs > 0 ? me(e, t.edges, t.edgeThresholdMs) : null;
	return n ? {
		ms: n.edge,
		source: "edge"
	} : t.snap === "none" ? {
		ms: e,
		source: "none"
	} : {
		ms: pe(e, t.snap, t.zone),
		source: "grid"
	};
}
//#endregion
//#region src/core/virtual.ts
function he(e, t, n, r, i = 5) {
	if (r <= 0 || n <= 0) return {
		start: 0,
		end: 0
	};
	let a = Math.floor(Math.max(0, e) / n), o = Math.ceil(Math.max(0, t) / n) + 1;
	return {
		start: Math.max(0, a - i),
		end: Math.min(r, a + o + i)
	};
}
function ge(e) {
	let t = [0], n = 0;
	for (let r of e) n += r, t.push(n);
	return t;
}
function _e(e, t) {
	let n = e.length - 1;
	if (n <= 0) return -1;
	let r = 0, i = n - 1;
	for (; r < i;) {
		let n = r + i + 1 >> 1;
		e[n] <= t ? r = n : i = n - 1;
	}
	return r;
}
function ve(e, t, n, r = 5) {
	let i = e.length - 1;
	if (i <= 0) return {
		start: 0,
		end: 0
	};
	let a = Math.max(0, t), o = _e(e, a), s = _e(e, a + Math.max(0, n));
	return {
		start: Math.max(0, o - r),
		end: Math.min(i, s + 1 + r)
	};
}
//#endregion
//#region src/core/drag.ts
function ye(e) {
	let { kind: t, originStart: n, originEnd: r, scale: i, snap: a, minDurationMs: o } = e, s = e.deltaPx / i.pxPerMs, c = r - n, l = e.originRowIndex;
	if (e.allowVertical && t === "move" && e.rowCount > 0 && e.rowTops && e.anchorY !== void 0) l = ae(_e(e.rowTops, e.anchorY + e.deltaY), 0, e.rowCount - 1);
	else if (e.allowVertical && t === "move" && e.rowCount > 0) {
		let t = e.deltaY / e.rowHeight, n = Math.sign(t) * Math.round(Math.abs(t));
		l = ae(e.originRowIndex + n, 0, e.rowCount - 1);
	}
	if (t === "move") {
		let e = n + s, t = r + s, i = a.edgeThresholdMs > 0 ? me(e, a.edges, a.edgeThresholdMs) : null, o = a.edgeThresholdMs > 0 ? me(t, a.edges, a.edgeThresholdMs) : null, u = null;
		if (i && (!o || i.distance <= o.distance) ? u = {
			start: i.edge,
			source: "edge"
		} : o && (u = {
			start: o.edge - c,
			source: "edge"
		}), !u) {
			let t = x(e, {
				...a,
				edges: []
			});
			u = {
				start: t.ms,
				source: t.source
			};
		}
		return {
			start: u.start,
			end: u.start + c,
			rowIndex: l,
			snappedTo: u.source
		};
	}
	if (t === "resize-start") {
		let e = x(n + s, a), t = r - o;
		return e.ms > t ? {
			start: t,
			end: r,
			rowIndex: l,
			snappedTo: "none"
		} : {
			start: e.ms,
			end: r,
			rowIndex: l,
			snappedTo: e.source
		};
	}
	let u = x(r + s, a), d = n + o;
	return u.ms < d ? {
		start: n,
		end: d,
		rowIndex: l,
		snappedTo: "none"
	} : {
		start: n,
		end: u.ms,
		rowIndex: l,
		snappedTo: u.source
	};
}
function be(e) {
	let { action: t, direction: n, start: r, end: i, snap: a, minDurationMs: o } = e, c = e.zone ?? "local", l = de(a) || 36e5, u = (e) => {
		if (a === "hour" || a === "day") {
			let t = pe(e, a, c), r = s.fromMillis(e, { zone: c });
			return t === e ? r.plus({ [a]: n }).toMillis() : n > 0 ? r.startOf(a).plus({ [a]: 1 }).toMillis() : r.startOf(a).toMillis();
		}
		return a === "none" || Math.round(e / l) * l === e ? e + n * l : n > 0 ? Math.ceil(e / l) * l : Math.floor(e / l) * l;
	};
	if (t === "move") {
		let e = u(r);
		return {
			start: e,
			end: e + (i - r)
		};
	}
	return t === "resize-start" ? {
		start: Math.min(u(r), i - o),
		end: i
	} : {
		start: r,
		end: Math.max(u(i), r + o)
	};
}
//#endregion
//#region src/core/header.ts
var S = {
	hour: [{
		unit: "day",
		format: "ccc d LLL yyyy"
	}, {
		unit: "hour",
		format: "HH:mm"
	}],
	day: [{
		unit: "month",
		format: "LLLL yyyy"
	}, {
		unit: "day",
		format: "d"
	}],
	week: [{
		unit: "month",
		format: "LLLL yyyy"
	}, {
		unit: "week",
		format: "d LLL"
	}],
	month: [{
		unit: "year",
		format: "yyyy"
	}, {
		unit: "month",
		format: "LLL"
	}]
}, xe = {
	year: ["year", 0],
	month: ["month", 1],
	day: ["day", 1],
	hour: ["hour", 0],
	minute: ["minute", 0]
};
function C(e, t, n) {
	let r = e.startOf(t), i = xe[t];
	if (n <= 1 || !i) return r;
	let [a, o] = i;
	return r.set({ [a]: Math.floor((r.get(a) - o) / n) * n + o });
}
function Se(e, t, n) {
	if (n <= 1) return e.plus({ [t]: 1 });
	let r = e.plus({ [t]: n }), i = C(r, t, n);
	for (; i.toMillis() <= e.toMillis();) r = r.plus({ [t]: 1 }), i = C(r, t, n);
	return i;
}
function w(e, t, n, r) {
	let i = [], a = Math.max(1, Math.floor(t.step ?? 1)), o = C(s.fromMillis(e.startMs, {
		zone: n,
		locale: r
	}), t.unit, a);
	for (; o.toMillis() < e.endMs;) {
		let n = Se(o, t.unit, a);
		i.push({
			key: `${t.unit}-${o.toMillis()}`,
			startMs: Math.max(o.toMillis(), e.startMs),
			endMs: Math.min(n.toMillis(), e.endMs),
			label: typeof t.format == "string" ? o.toFormat(t.format) : t.format(o)
		}), o = n;
	}
	return i;
}
function Ce(e, t, n = "local", r, i = S[t]) {
	return {
		top: w(e, i[0], n, r),
		bottom: w(e, i[1], n, r)
	};
}
//#endregion
//#region src/core/lanes.ts
function we(e) {
	let t = e.slice().sort((e, t) => e.start - t.start || (e.id < t.id ? -1 : +(e.id > t.id))), n = [], r = /* @__PURE__ */ new Map();
	for (let e of t) {
		let t = n.findIndex((t) => t <= e.start);
		t < 0 ? (t = n.length, n.push(e.end)) : n[t] = e.end, r.set(e.id, t);
	}
	return {
		lanes: r,
		count: Math.max(1, n.length)
	};
}
//#endregion
//#region src/core/resources.ts
function Te(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	e.forEach((e, t) => i.set(e.id, t));
	let a = e.map(() => []), o = (e, t, n) => {
		let r = e.rowId === void 0 ? void 0 : i.get(e.rowId);
		if (r !== void 0) {
			let i = {
				parentId: t ? t.id : null,
				index: n
			};
			a[r].push({
				task: e,
				parent: t,
				position: i,
				start: _(e.start),
				end: _(e.end)
			});
		}
		e.children?.forEach((t, n) => o(t, e, n));
	};
	t.forEach((e, t) => o(e, null, t));
	let s = /* @__PURE__ */ new Map(), c = [], l = e.map((e, t) => {
		let i = a[t], { lanes: o, count: l } = we(i.map((e) => ({
			id: e.task.id,
			start: e.start,
			end: e.end
		}))), u = i.slice().sort((e, t) => e.start - t.start || (e.task.id < t.task.id ? -1 : +(e.task.id > t.task.id))).map((e) => {
			let n = o.get(e.task.id);
			return s.set(e.task.id, {
				rowIndex: t,
				lane: n
			}), {
				task: e.task,
				parent: e.parent,
				position: e.position,
				lane: n
			};
		}), d = n + (l - 1) * r;
		return c.push(d), {
			key: e.id,
			row: e,
			index: t,
			top: 0,
			height: d,
			laneCount: l,
			bars: u
		};
	}), u = ge(c);
	return l.forEach((e, t) => {
		e.top = u[t];
	}), {
		rows: l,
		offsets: u,
		height: u[u.length - 1],
		rowIndexById: i,
		barsById: s
	};
}
//#endregion
//#region src/core/rows.ts
function T(e) {
	return Array.isArray(e.children) && e.children.length > 0;
}
function Ee(e, t) {
	return e.parentMode ?? t;
}
function De(e, t, n) {
	let r = [];
	return e.forEach((e, i) => {
		let a = {
			parentId: null,
			index: i
		};
		if (!T(e)) {
			r.push({
				key: e.id,
				task: e,
				parent: null,
				depth: 0,
				kind: "leaf",
				mode: null,
				expanded: !1,
				bars: [{
					task: e,
					parent: null
				}],
				position: a
			});
			return;
		}
		let o = Ee(e, n), s = t.has(e.id), c = e.children ?? [];
		r.push({
			key: e.id,
			task: e,
			parent: null,
			depth: 0,
			kind: "group",
			mode: o,
			expanded: s,
			bars: o === "independent" ? [{
				task: e,
				parent: null
			}] : c.map((t) => ({
				task: t,
				parent: e
			})),
			position: a
		}), s && c.forEach((t, n) => {
			r.push({
				key: t.id,
				task: t,
				parent: e,
				depth: 1,
				kind: "child",
				mode: null,
				expanded: !1,
				bars: [{
					task: t,
					parent: e
				}],
				position: {
					parentId: e.id,
					index: n
				}
			});
		});
	}), r;
}
function Oe(e, t, n) {
	let r = e[t];
	if (!r) return null;
	if (T(n) && r.depth === 1) {
		let t = e.find((e) => e.depth === 0 && e.task.id === r.parent?.id);
		return t ? { ...t.position } : null;
	}
	return { ...r.position };
}
function E(e, t) {
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		if (r.id === t) return {
			task: r,
			position: {
				parentId: null,
				index: n
			}
		};
		let i = r.children ?? [];
		for (let e = 0; e < i.length; e++) {
			let n = i[e];
			if (n.id === t) return {
				task: n,
				position: {
					parentId: r.id,
					index: e
				}
			};
		}
	}
	return null;
}
function ke(e, t) {
	return e.parentId === t.parentId && e.index === t.index;
}
function Ae(e, t) {
	return e.findIndex((e) => e.task.id === t);
}
//#endregion
//#region src/hooks/useControllableSet.ts
function je(e, n, r) {
	let [s, c] = o(() => new Set(n ?? [])), l = e !== void 0, u = i(() => e ? new Set(e) : null, [e]), d = l && u ? u : s, f = a(d);
	f.current = d;
	let p = a(r);
	return p.current = r, [d, t((e, t) => {
		let n = f.current, r = t ?? !n.has(e);
		if (r === n.has(e)) return;
		let i = new Set(n);
		r ? i.add(e) : i.delete(e), l || c(i), p.current?.(Array.from(i));
	}, [l])];
}
var D = 40, Me = 12;
function O(e) {
	let t = a(e);
	return t.current = e, t;
}
function Ne(e) {
	let r = O(e), i = a(null), s = a(null), c = a(null), l = a({
		vx: 0,
		vy: 0,
		raf: null
	}), [u, d] = o(null), f = t(() => {
		let e = l.current;
		e.raf !== null && typeof cancelAnimationFrame == "function" && cancelAnimationFrame(e.raf), e.raf = null, e.vx = 0, e.vy = 0;
	}, []), p = t((e, t) => {
		let n = i.current;
		if (!n) return;
		let a = r.current, o = a.scrollerRef.current, u = o ? o.scrollLeft - n.startScrollLeft : 0, f = o ? o.scrollTop - n.startScrollTop : 0, m = a.snapToTasks ? a.snapThresholdPx / a.scale.pxPerMs : 0, h = {
			kind: n.kind,
			originStart: n.originStart,
			originEnd: n.originEnd,
			deltaPx: e - n.startX + u,
			deltaY: t - n.startY + f,
			originRowIndex: n.originRowIndex,
			rowCount: a.rowCount,
			rowHeight: a.rowHeight,
			rowTops: a.rowTops,
			anchorY: n.anchorY,
			scale: a.scale,
			snap: {
				snap: a.snap,
				edges: n.edges,
				edgeThresholdMs: m,
				zone: a.zone
			},
			minDurationMs: a.minDurationMs,
			allowVertical: a.allowVertical
		}, g = ye(h), _ = ye({
			...h,
			snap: {
				snap: "none",
				edges: [],
				edgeThresholdMs: 0
			}
		});
		if (s.current = g, d({
			session: n,
			result: g,
			deltaX: h.deltaPx,
			deltaY: h.deltaY,
			raw: {
				start: _.start,
				end: _.end
			}
		}), a.onPreview(n, g), o) {
			let s = o.getBoundingClientRect(), u = l.current;
			if (s.width > 0 && s.height > 0 && (u.vx = e > s.right - D ? Me : e < s.left + D ? -12 : 0, u.vy = n.kind === "move" && a.allowVertical ? t > s.bottom - D ? Me : t < s.top + D ? -12 : 0 : 0, (u.vx || u.vy) && u.raf === null && typeof requestAnimationFrame == "function")) {
				let e = () => {
					let t = i.current, n = r.current.scrollerRef.current, a = l.current;
					if (!t || !n || !a.vx && !a.vy) {
						a.raf = null;
						return;
					}
					n.scrollLeft += a.vx, n.scrollTop += a.vy;
					let o = c.current;
					o && p(o.x, o.y), a.raf = requestAnimationFrame(e);
				};
				u.raf = requestAnimationFrame(e);
			}
		}
	}, [r]), m = t((e) => {
		let t = i.current;
		t && e && e.hasPointerCapture?.(t.pointerId) && e.releasePointerCapture(t.pointerId), t && t.moved && r.current.onPreview(t, null), i.current = null, s.current = null, c.current = null, f(), d(null);
	}, [r, f]), h = t(() => {
		i.current && m(null);
	}, [m]);
	return n(() => {
		if (!u) return;
		let e = (e) => {
			e.key === "Escape" && (e.preventDefault(), h());
		};
		return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
	}, [u, h]), n(() => () => f(), [f]), {
		drag: u,
		getBarHandlers: t((e, t, n) => ({
			onPointerDown: (a) => {
				let o = r.current;
				if (!o.enabled || a.button !== 0 || i.current) return;
				let s = o.getInterval(e);
				if (!s) return;
				let c = a.target.closest?.("[data-handle]")?.getAttribute("data-handle"), l = c === "start" ? "resize-start" : c === "end" ? "resize-end" : "move";
				l !== "move" && !o.allowResize && (l = "move");
				let u = o.scrollerRef.current;
				i.current = {
					taskId: e,
					kind: l,
					originStart: s.start,
					originEnd: s.end,
					originRowIndex: t,
					anchorY: n,
					pointerId: a.pointerId,
					startX: a.clientX,
					startY: a.clientY,
					startScrollLeft: u?.scrollLeft ?? 0,
					startScrollTop: u?.scrollTop ?? 0,
					edges: o.getEdges(e),
					moved: !1
				}, a.currentTarget.setPointerCapture?.(a.pointerId);
			},
			onPointerMove: (e) => {
				let t = i.current;
				if (t && t.pointerId === e.pointerId) {
					if (!t.moved) {
						let n = e.clientX - t.startX, r = e.clientY - t.startY;
						if (Math.hypot(n, r) < 3) return;
						t.moved = !0;
					}
					e.preventDefault(), c.current = {
						x: e.clientX,
						y: e.clientY
					}, p(e.clientX, e.clientY);
				}
			},
			onPointerUp: (e) => {
				let t = i.current;
				if (!t || t.pointerId !== e.pointerId) return;
				let n = e.currentTarget;
				t.moved && p(e.clientX, e.clientY);
				let a = s.current;
				t.moved && a ? (m(n), r.current.onDrop(t, a)) : (m(n), r.current.onClick(t, e));
			},
			onPointerCancel: (e) => {
				let t = i.current;
				t && t.pointerId === e.pointerId && m(e.currentTarget);
			},
			onLostPointerCapture: (e) => {
				let t = i.current;
				t && t.pointerId === e.pointerId && m(null);
			}
		}), [
			r,
			p,
			m
		]),
		cancel: h
	};
}
//#endregion
//#region src/hooks/useScrollViewport.ts
function Pe(e) {
	let [r, i] = o({
		scrollTop: 0,
		scrollLeft: 0,
		height: 0,
		width: 0
	});
	return n(() => {
		let t = e.current;
		if (!t) return;
		let n = () => {
			i((e) => {
				let n = t.clientHeight, r = t.clientWidth;
				return e.height === n && e.width === r ? e : {
					...e,
					height: n,
					width: r
				};
			});
		};
		if (n(), typeof ResizeObserver > "u") return;
		let r = new ResizeObserver(n);
		return r.observe(t), () => r.disconnect();
	}, [e]), [r, t((e) => {
		let t = e.currentTarget;
		i((e) => e.scrollTop === t.scrollTop && e.scrollLeft === t.scrollLeft ? e : {
			...e,
			scrollTop: t.scrollTop,
			scrollLeft: t.scrollLeft
		});
	}, [])];
}
//#endregion
//#region src/core/selection.ts
function Fe(e, t) {
	return t.type === "clear" ? e.length ? [] : e : t.additive ? e.includes(t.id) ? e.filter((e) => e !== t.id) : [...e, t.id] : e.length === 1 && e[0] === t.id ? e : [t.id];
}
//#endregion
//#region src/hooks/useSelection.ts
function Ie(e, n) {
	let [r, s] = o([]), c = e !== void 0, l = c ? e : r, u = a(l);
	u.current = l;
	let d = a(n);
	d.current = n;
	let f = t((e) => {
		let t = Fe(u.current, e);
		t !== u.current && (u.current = t, c || s(t), d.current?.(t.slice()));
	}, [c]);
	return [i(() => new Set(l), [l]), f];
}
//#endregion
//#region src/components/DraftToolbar.tsx
function k(...e) {
	return e.filter(Boolean).join(" ");
}
function Le({ changes: e, commit: t, discard: n, labels: r, classNames: i }) {
	return /* @__PURE__ */ l("div", {
		"data-gantt": "draft-toolbar",
		role: "status",
		className: k("gantt-draft-toolbar absolute right-3 bottom-3 z-50 flex items-center gap-2 rounded-lg border border-[var(--gantt-grid-major-color)] bg-[var(--gantt-bg)] px-3 py-2 text-sm", i.draftToolbar),
		children: [
			/* @__PURE__ */ c("span", {
				className: "text-[var(--gantt-muted)]",
				children: r.pendingChanges(e.length)
			}),
			/* @__PURE__ */ c("button", {
				type: "button",
				onClick: n,
				className: k("gantt-draft-button rounded-md border border-[var(--gantt-grid-major-color)] px-2 py-1 hover:bg-[var(--gantt-button-hover-bg)]", i.draftButton),
				children: r.discard
			}),
			/* @__PURE__ */ c("button", {
				type: "button",
				onClick: t,
				className: k("gantt-draft-button gantt-draft-button-primary rounded-md bg-[var(--gantt-drop-color)] px-2 py-1 text-[color:var(--gantt-drop-text)] hover:opacity-90", i.draftButton, i.draftButtonPrimary),
				children: r.commit
			})
		]
	});
}
//#endregion
//#region src/components/LinkLayer.tsx
function Re(...e) {
	return e.filter(Boolean).join(" ");
}
function ze({ links: e, rects: t, left: n, top: r, width: i, height: a, classNames: o }) {
	let s = e.flatMap((e) => {
		let n = t.get(e.from), r = t.get(e.to);
		return n && r ? [{
			link: e,
			geometry: le(n, r, e.type)
		}] : [];
	});
	return s.length ? /* @__PURE__ */ c("svg", {
		"data-gantt": "links",
		"aria-hidden": !0,
		className: "gantt-links pointer-events-none absolute z-[1] overflow-visible",
		style: {
			left: n,
			top: r,
			width: i,
			height: a
		},
		children: s.map(({ link: e, geometry: t }) => /* @__PURE__ */ l("g", {
			"data-gantt": "link",
			"data-link-id": e.id,
			"data-type": e.type ?? "finish_start",
			className: Re("gantt-link", o.link),
			children: [/* @__PURE__ */ c("path", {
				d: t.path,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1
			}), /* @__PURE__ */ c("path", {
				d: t.arrow,
				fill: "currentColor"
			})]
		}, e.id))
	}) : null;
}
//#endregion
//#region src/components/TaskBar.tsx
function A(...e) {
	return e.filter(Boolean).join(" ");
}
function Be(e) {
	let { task: t, classNames: n } = e, r = {
		left: e.left,
		width: e.width,
		top: e.top ?? "15%",
		height: e.height ?? "70%",
		transform: e.translateY ? `translateY(${e.translateY}px)` : void 0,
		zIndex: e.isDragging ? 10 : e.isSelected ? 3 : 2,
		"--gantt-bar-bg": t.color,
		...e.style
	};
	return /* @__PURE__ */ l("div", {
		"data-gantt": "bar",
		"data-task-id": t.id,
		"data-dragging": e.isDragging || void 0,
		"data-pending": e.isPending || void 0,
		"data-selected": e.isSelected || void 0,
		"data-highlighted": e.isHighlighted || void 0,
		"data-invalid": e.isInvalid || void 0,
		"data-kind": e.isGroup ? "group" : e.isChild ? "child" : "leaf",
		role: "button",
		tabIndex: e.interactive ? 0 : -1,
		"aria-label": e.ariaLabel,
		className: A("gantt-bar absolute flex items-center rounded-md text-xs select-none touch-none", e.interactive ? "cursor-grab focus:outline-2 focus:outline-offset-1 focus:outline-[color:var(--gantt-focus-color)]" : "cursor-default", e.isDragging && "cursor-grabbing", n.bar, e.isGroup && n.barGroup, e.isChild && n.barChild, e.isPending && n.barPending, e.isDragging && n.barDragging, e.isSelected && n.barSelected, e.isHighlighted && n.barHighlighted, e.isInvalid && n.barInvalid, e.className),
		style: r,
		...e.handlers ?? {},
		onKeyDown: e.onKeyDown,
		children: [
			e.showHandles && /* @__PURE__ */ c("div", {
				"data-handle": "start",
				"aria-hidden": !0,
				className: A("gantt-handle absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-md hover:bg-[var(--gantt-handle-hover-bg)]", n.handle)
			}),
			/* @__PURE__ */ c("div", {
				className: A("gantt-bar-label min-w-0 flex-1 truncate px-2", n.barLabel),
				children: e.children
			}),
			e.showHandles && /* @__PURE__ */ c("div", {
				"data-handle": "end",
				"aria-hidden": !0,
				className: A("gantt-handle absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-md hover:bg-[var(--gantt-handle-hover-bg)]", n.handle)
			})
		]
	});
}
//#endregion
//#region src/components/TimelineHeader.tsx
function j(...e) {
	return e.filter(Boolean).join(" ");
}
function Ve(e, t, n) {
	return n ? e.filter((e) => y(t, e.endMs) >= n.left && y(t, e.startMs) <= n.right) : e;
}
function He(e) {
	let { tiers: t, scale: n, classNames: r } = e, i = e.headerHeight / 2, a = (t, a) => /* @__PURE__ */ c("div", {
		"data-gantt": `header-${a}`,
		className: j("relative", a === "top" ? r.headerTierTop : r.headerTierBottom),
		style: { height: i },
		children: Ve(t, n, e.window).map((t) => {
			let i = y(n, t.startMs), o = y(n, t.endMs) - i, s = a === "bottom" && e.showTicks;
			return /* @__PURE__ */ l("div", {
				"data-gantt": "header-cell",
				"data-tier": a,
				className: j("gantt-header-cell absolute inset-y-0 overflow-hidden border-b border-[var(--gantt-grid-color)] px-1 text-xs leading-none whitespace-nowrap text-[var(--gantt-muted)] flex items-center", !s && "border-r", a === "top" ? "font-medium" : !s && "justify-center", r.headerCell),
				style: {
					left: i,
					width: o
				},
				title: t.label,
				children: [s && t.startMs > n.startMs && /* @__PURE__ */ c("span", {
					"data-gantt": "header-tick",
					"aria-hidden": !0,
					className: j("gantt-header-tick absolute bottom-0 left-0 h-[var(--gantt-tick-height)] w-px bg-[var(--gantt-grid-major-color)]", r.headerTick)
				}), e.renderHeaderCell ? e.renderHeaderCell(t, a) : t.label]
			}, t.key);
		})
	});
	return /* @__PURE__ */ l("div", {
		"data-gantt": "header",
		className: j("gantt-header sticky top-0 z-30 flex bg-[var(--gantt-bg)]", r.header),
		style: {
			height: e.headerHeight,
			width: e.sidebarWidth + e.timelineWidth
		},
		children: [/* @__PURE__ */ c("div", {
			"data-gantt": "header-sidebar",
			className: j("gantt-header-sidebar sticky left-0 z-40 flex shrink-0 items-center border-r border-b border-[var(--gantt-grid-major-color)] bg-[var(--gantt-bg)]", r.headerSidebar),
			style: { width: e.sidebarWidth },
			children: e.renderSidebarHeader?.()
		}), /* @__PURE__ */ l("div", {
			"data-gantt": "header-timeline",
			className: j("gantt-header-timeline relative shrink-0", r.headerTimeline),
			style: { width: e.timelineWidth },
			children: [
				a(t.top, "top"),
				a(t.bottom, "bottom"),
				e.nowMarker && /* @__PURE__ */ c("div", {
					"data-gantt": "now-marker",
					className: j("gantt-now-marker absolute bottom-0 z-10 flex w-0 items-center justify-center overflow-visible", r.nowMarker),
					style: {
						left: e.nowMarker.left,
						height: i
					},
					children: e.nowMarker.content
				})
			]
		})]
	});
}
//#endregion
//#region src/components/Gantt.tsx
var Ue = {
	hour: 60,
	day: 40,
	week: 140,
	month: 160
}, We = [
	"hour",
	"day",
	"week",
	"month"
], Ge = {
	commit: "Apply",
	discard: "Discard",
	pendingChanges: (e) => `${e} pending change${e > 1 ? "s" : ""}`,
	expand: "Expand",
	collapse: "Collapse",
	bar: (e, t, n) => `${typeof e.label == "string" ? e.label : e.id}: ${t.toLocaleString({
		dateStyle: "short",
		timeStyle: "short"
	})} – ${n.toLocaleString({
		dateStyle: "short",
		timeStyle: "short"
	})}`
};
function M(...e) {
	return e.filter(Boolean).join(" ");
}
function Ke(e) {
	let t = /* @__PURE__ */ new Map(), n = (e) => {
		t.set(e.id, {
			start: _(e.start),
			end: _(e.end)
		}), e.children?.forEach(n);
	};
	return e.forEach(n), t;
}
function qe(e) {
	return {
		key: e.task.id,
		task: e.task,
		parent: e.parent,
		depth: +!!e.parent,
		kind: e.parent ? "child" : T(e.task) ? "group" : "leaf",
		mode: null,
		expanded: !1,
		bars: [{
			task: e.task,
			parent: e.parent
		}],
		position: e.position
	};
}
function Je(e, s) {
	let { tasks: u, rows: f, laneHeight: p, barInset: m, zoom: h = "day", onZoomChange: g, range: re, zone: b = "local", locale: ce, snap: le = "hour", snapToTasks: fe = !0, snapThresholdPx: pe = 8, minDuration: me, parentMode: x = "independent", expandedIds: ge, defaultExpandedIds: _e, onExpandedChange: ye, readOnly: S = !1, allowVerticalMove: xe = !0, allowResize: C = !0, onTaskChange: Se, onDragPreview: w, onTaskClick: we, selectedIds: Ee, onSelectionChange: D, highlightedIds: Me, canDrop: O, dragFollowsPointer: Fe = !1, links: k, showLinks: Re = "selected", draft: A = !1, onDraftChange: j, onDraftCommit: Je, showDraftToolbar: Ye = !0, renderDraftToolbar: Xe, rowHeight: N = 36, columnWidth: Ze, sidebarWidth: P = 240, headerHeight: F = 48, overscan: Qe = 5, height: $e = 500, closedRanges: et, closedNarrowThreshold: tt = 30, showNow: nt = !0, now: rt, renderNow: it, renderBar: at, renderLabel: ot, renderRowLabel: st, renderHeaderCell: ct, renderSidebarHeader: lt, headerTiers: ut, showTicks: dt = !1, barClassName: ft, barStyle: pt, classNames: I = {}, className: mt, style: ht, labels: gt } = e, _t = i(() => ({
		...Ge,
		...gt
	}), [gt]), vt = Ze ?? Ue[h], yt = me ?? Math.max(de(le), 6e4), L = a(null), [R, bt] = Pe(L), [xt, St] = je(ge, _e, ye), z = Ee !== void 0 || D !== void 0, [Ct, B] = Ie(Ee, D), wt = i(() => new Set(Me ?? []), [Me]), [V, Tt] = o(() => /* @__PURE__ */ new Map()), H = i(() => Array.from(V.values()), [V]);
	n(() => {
		A || Tt((e) => e.size ? /* @__PURE__ */ new Map() : e);
	}, [A]);
	let Et = a(j);
	Et.current = j;
	let Dt = a(!0);
	n(() => {
		if (Dt.current) {
			Dt.current = !1;
			return;
		}
		Et.current?.(H);
	}, [H]);
	let U = i(() => A && H.length ? d(u, H) : u, [
		u,
		A,
		H
	]), W = p ?? N, G = i(() => f ? Te(f, U, N, W) : null, [
		f,
		U,
		N,
		W
	]), K = i(() => G ? [] : De(U, xt, x), [
		G,
		U,
		xt,
		x
	]), Ot = G ? G.rows.length : K.length, q = (e) => G ? G.offsets[e] : e * N, J = i(() => Ke(U), [U]), Y = i(() => re ? {
		startMs: _(re.start),
		endMs: _(re.end)
	} : ie(U, h, b), [
		re,
		U,
		h,
		b
	]), X = i(() => ee(Y.startMs, Y.endMs, h, vt), [
		Y,
		h,
		vt
	]), kt = ne(X), At = ut?.[h], jt = i(() => Ce(Y, h, b, ce, At), [
		Y,
		h,
		b,
		ce,
		At
	]), Mt = P + kt, Nt = G ? G.height : K.length * N, Pt = G !== null || m !== void 0, Ft = m ?? Math.round(N * .15), It = Math.max(1, N - 2 * Ft), Lt = (e) => Pt ? e * W + Ft : void 0, Z = i(() => {
		if (R.width <= 0) return null;
		let e = R.width;
		return {
			left: R.scrollLeft - P - e,
			right: R.scrollLeft - P + R.width + e
		};
	}, [
		R.width,
		R.scrollLeft,
		P
	]), Rt = i(() => {
		let e = Math.max(0, R.height - F);
		return G ? ve(G.offsets, R.scrollTop, e, Qe) : he(R.scrollTop, e, N, K.length, Qe);
	}, [
		G,
		R.scrollTop,
		R.height,
		F,
		N,
		K.length,
		Qe
	]), zt = t((e) => {
		if (A) {
			Tt((t) => {
				let n = new Map(t);
				return n.delete(e.id), n.set(e.id, e), n;
			});
			return;
		}
		Se?.(e);
	}, [A, Se]), Q = t((e, t, n, r, i, a) => {
		let o = E(U, e);
		if (!o) return null;
		let s = J.get(e), c = V.get(e), l = c?.previousPosition ?? E(u, e)?.position ?? o.position, d = c?.previousStart ?? v(s.start, b), f = c?.previousEnd ?? v(s.end, b), p = t !== s.start || n !== s.end, m = i !== void 0 && !ke(i, o.position), h = a !== void 0 && a !== o.task.rowId;
		if (!p && !m && !h) return null;
		let g = m ? i : c?.position, _ = {
			id: e,
			start: v(t, b),
			end: v(n, b),
			previousStart: d,
			previousEnd: f,
			reason: r,
			previousPosition: l
		};
		if (g && (_.position = g), G) {
			let t = h ? a : c?.rowId;
			t !== void 0 && (_.rowId = t);
			let n = c ? c.previousRowId : E(u, e)?.task.rowId ?? o.task.rowId;
			n !== void 0 && (_.previousRowId = n);
		}
		return _;
	}, [
		U,
		J,
		V,
		u,
		b,
		G
	]), Bt = i(() => Array.from(J.entries()), [J]), Vt = t((e) => {
		let t = [];
		for (let [n, r] of Bt) n !== e && t.push(r.start, r.end);
		return t;
	}, [Bt]), Ht = t((e, t) => {
		if (G) {
			let n = t.rowIndex === e.originRowIndex ? void 0 : G.rows[t.rowIndex]?.row.id;
			return Q(e.taskId, t.start, t.end, e.kind, void 0, n);
		}
		let n = E(U, e.taskId);
		if (!n) return null;
		let r;
		return t.rowIndex !== e.originRowIndex && (r = Oe(K, t.rowIndex, n.task) ?? void 0), Q(e.taskId, t.start, t.end, e.kind, r);
	}, [
		G,
		U,
		K,
		Q
	]), Ut = a(null), Wt = t((e, t) => {
		if (!O) return !0;
		let n = Ut.current;
		if (n && n.result === t && n.canDrop === O) return n.valid;
		let r = Ht(e, t), i = !r || O(r);
		return Ut.current = {
			result: t,
			canDrop: O,
			valid: i
		}, i;
	}, [O, Ht]), Gt = t((e, t) => {
		let n = Ht(e, t);
		n && (!O || O(n)) && zt(n);
	}, [
		Ht,
		O,
		zt
	]), Kt = t((e, t) => {
		let n = E(U, e.taskId);
		n && (we?.(n.task, t), !G && T(n.task) && St(n.task.id), z && B({
			type: "select",
			id: n.task.id,
			additive: t.shiftKey || t.metaKey || t.ctrlKey
		}));
	}, [
		U,
		we,
		St,
		G,
		z,
		B
	]), qt = t((e, t) => {
		if (!w) return;
		if (!t) {
			w(null);
			return;
		}
		let n = E(U, e.taskId), r = (!G && t.rowIndex !== e.originRowIndex && n ? Oe(K, t.rowIndex, n.task) : null) ?? n?.position ?? {
			parentId: null,
			index: 0
		}, i = {
			id: e.taskId,
			start: v(t.start, b),
			end: v(t.end, b),
			reason: e.kind,
			position: r,
			snappedTo: t.snappedTo
		}, a = G?.rows[t.rowIndex]?.row.id;
		a !== void 0 && (i.rowId = a), O && (i.valid = Wt(e, t)), w(i);
	}, [
		w,
		U,
		K,
		b,
		G,
		O,
		Wt
	]), { drag: $, getBarHandlers: Jt } = Ne({
		enabled: !S,
		scrollerRef: L,
		scale: X,
		rowCount: Ot,
		rowHeight: N,
		rowTops: G?.offsets,
		snap: le,
		zone: b,
		snapToTasks: fe,
		snapThresholdPx: pe,
		minDurationMs: yt,
		allowVertical: xe,
		allowResize: C,
		getInterval: (e) => J.get(e),
		getEdges: Vt,
		onPreview: qt,
		onDrop: Gt,
		onClick: Kt
	}), Yt = t((e, t, n) => {
		if (S) return;
		let r = J.get(t.id);
		if (r) switch (e.key) {
			case "ArrowLeft":
			case "ArrowRight": {
				let n = e.shiftKey ? "resize-end" : e.altKey ? "resize-start" : "move";
				if (n !== "move" && !C) return;
				e.preventDefault();
				let i = be({
					action: n,
					direction: e.key === "ArrowRight" ? 1 : -1,
					start: r.start,
					end: r.end,
					snap: le,
					minDurationMs: yt,
					zone: b
				}), a = Q(t.id, i.start, i.end, "keyboard", void 0);
				a && (!O || O(a)) && zt(a);
				return;
			}
			case "ArrowUp":
			case "ArrowDown": {
				if (!xe) return;
				e.preventDefault();
				let i = ae(n + (e.key === "ArrowDown" ? 1 : -1), 0, Ot - 1);
				if (i === n) return;
				if (G) {
					let e = Q(t.id, r.start, r.end, "keyboard", void 0, G.rows[i].row.id);
					e && (!O || O(e)) && zt(e);
					return;
				}
				let a = Oe(K, i, t);
				if (!a) return;
				let o = Q(t.id, r.start, r.end, "keyboard", a);
				o && (!O || O(o)) && zt(o);
				return;
			}
			case "Enter":
			case " ":
				!G && T(t) ? (e.preventDefault(), St(t.id)) : z && (e.preventDefault(), B({
					type: "select",
					id: t.id,
					additive: e.shiftKey || e.metaKey || e.ctrlKey
				}));
				return;
			default: return;
		}
	}, [
		S,
		J,
		C,
		xe,
		le,
		yt,
		b,
		K,
		Ot,
		G,
		Q,
		O,
		zt,
		St,
		z,
		B
	]), Xt = a(null), Zt = a(!1);
	Zt.current = $ !== null;
	let Qt = Ct.size > 0;
	n(() => {
		if (!z || !Qt) return;
		let e = (e) => {
			if (e.key !== "Escape" || e.defaultPrevented || Zt.current) return;
			let t = e.target;
			(!t || t === document.body || t === document.documentElement || Xt.current?.contains(t)) && B({ type: "clear" });
		};
		return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
	}, [
		z,
		Qt,
		B
	]);
	let $t = t((e) => {
		if (!z) return;
		let t = e.target;
		t.closest("[data-gantt=\"timeline-cell\"]") && !t.closest("[data-gantt=\"bar\"]") && B({ type: "clear" });
	}, [z, B]), en = t((e) => {
		if (!g || !e.ctrlKey) return;
		e.preventDefault();
		let t = We.indexOf(h), n = ae(t + (e.deltaY > 0 ? 1 : -1), 0, We.length - 1);
		n !== t && g(We[n]);
	}, [g, h]), tn = t(() => {
		H.length && Je?.(H) !== !1 && Tt(/* @__PURE__ */ new Map());
	}, [H, Je]), nn = t(() => Tt((e) => e.size ? /* @__PURE__ */ new Map() : e), []);
	r(s, () => ({
		commitDraft: tn,
		discardDraft: nn,
		getPendingChanges: () => Array.from(V.values()),
		scrollToTask: (e) => {
			let t = L.current, n = G ? G.barsById.get(e)?.rowIndex ?? -1 : Ae(K, e);
			if (n < 0 && !G) {
				let t = E(U, e)?.position.parentId;
				t && (n = Ae(K, t));
			}
			if (!t || n < 0) return;
			t.scrollTo({ top: q(n) });
			let r = J.get(e);
			r && t.scrollTo({ left: Math.max(0, y(X, r.start) - 40) });
		},
		scrollToTime: (e) => {
			let t = L.current;
			t && t.scrollTo({ left: Math.max(0, y(X, _(e)) - 40) });
		},
		getScrollElement: () => L.current
	}), [
		tn,
		nn,
		V,
		K,
		N,
		J,
		X,
		U,
		G
	]);
	let rn = rt === void 0 ? Date.now() : _(rt), an = y(X, rn), on = nt && rn >= Y.startMs && rn <= Y.endMs, sn = i(() => {
		let e = new Set(jt.top.map((e) => e.startMs));
		return Ve(jt.bottom, X, Z).map((t) => ({
			key: t.key,
			left: y(X, t.startMs),
			major: e.has(t.startMs)
		}));
	}, [
		jt,
		X,
		Z
	]), cn = $?.session.taskId ?? null, ln = $ && $.result.rowIndex !== $.session.originRowIndex ? $.result.rowIndex : -1, un = $ !== null && !Wt($.session, $.result), dn = Fe && $ !== null, fn = (e) => Lt(e) ?? N * .15, pn = Pt ? It : N * .7, mn = (e, t) => {
		if (!$) return 0;
		let n = $.result.rowIndex;
		return G ? n === e ? 0 : q(n) - (q(e) + t * W) : (n - e) * N;
	}, hn = i(() => {
		let e = /* @__PURE__ */ new Map();
		if (!G || !A) return e;
		for (let t of H) {
			let n = t.previousRowId === void 0 ? void 0 : G.rowIndexById.get(t.previousRowId);
			if (n === void 0) continue;
			let r = G.barsById.get(t.id), i = r && r.rowIndex === n ? r.lane : 0, a = e.get(n) ?? [];
			a.push({
				id: t.id,
				start: t.previousStart.toMillis(),
				end: t.previousEnd.toMillis(),
				lane: i
			}), e.set(n, a);
		}
		return e;
	}, [
		G,
		A,
		H
	]), gn = i(() => /* @__PURE__ */ new Map(), [et, f ?? K]), _n = Z ? {
		start: Math.max(X.startMs, te(X, Z.left)),
		end: Math.min(X.endMs, te(X, Z.right))
	} : {
		start: X.startMs,
		end: X.endMs
	}, vn = (e, t) => {
		if (!et) return null;
		let n = gn.get(e);
		return n || (n = oe(et(t)), gn.set(e, n)), se(n, _n.start, _n.end).map((e, t) => {
			let n = y(X, e.start), r = y(X, e.end) - n;
			return /* @__PURE__ */ c("div", {
				"data-gantt": "closed",
				"data-narrow": r < tt || void 0,
				"aria-hidden": !0,
				className: M("gantt-closed pointer-events-none absolute inset-y-0", I.closedRange),
				style: {
					left: n,
					width: r
				}
			}, `closed-${t}-${e.start}`);
		});
	}, yn = {
		height: $e,
		"--gantt-row-height": `${N}px`,
		"--gantt-header-height": `${F}px`,
		"--gantt-sidebar-width": `${P}px`,
		...G ? { "--gantt-lane-height": `${W}px` } : {},
		...ht
	}, bn = (e, t, n, r) => {
		let i = Lt(r);
		return /* @__PURE__ */ c("div", {
			"data-gantt": "ghost",
			"aria-hidden": !0,
			className: M("gantt-ghost pointer-events-none absolute z-[2] rounded-md", I.ghost),
			style: {
				left: y(X, t),
				width: Math.max(2, y(X, n) - y(X, t)),
				top: i ?? "15%",
				height: i === void 0 ? "70%" : It
			}
		}, e);
	}, xn = k && k.length ? ue(k, Re, Ct) : [], Sn = /* @__PURE__ */ new Map(), Cn = (e, t, n, r) => {
		let i = J.get(e.task.id);
		if (!i) return null;
		let a = cn === e.task.id && $ !== null && $.session.originRowIndex === t, o = a ? $.result.start : i.start, s = a ? $.result.end : i.end, u = a && dn ? $.raw : null, d = y(X, u ? u.start : o), f = Math.max(2, y(X, u ? u.end : s) - d);
		if (!a && Z && (d + f < Z.left || d > Z.right)) return null;
		let p = A && V.has(e.task.id), m = p && !G ? V.get(e.task.id) : void 0, h = T(e.task), g = {
			task: e.task,
			parent: e.parent,
			row: n,
			resource: r,
			lane: e.lane,
			start: v(o, b),
			end: v(s, b),
			isDragging: a,
			isPending: p,
			isGroup: h,
			isSelected: Ct.has(e.task.id),
			isHighlighted: wt.has(e.task.id)
		}, _ = Lt(e.lane), ee = a ? u ? $.session.kind === "move" && xe ? $.deltaY : 0 : mn(t, e.lane) : 0;
		return xn.length && !Sn.has(e.task.id) && Sn.set(e.task.id, {
			x: d,
			y: q(t) + fn(e.lane) + ee,
			width: f,
			height: pn
		}), /* @__PURE__ */ l("span", {
			className: "contents",
			children: [
				a && bn("drag-ghost", $.session.originStart, $.session.originEnd, e.lane),
				!a && m && bn("pending-ghost", m.previousStart.toMillis(), m.previousEnd.toMillis(), e.lane),
				/* @__PURE__ */ c(Be, {
					task: e.task,
					left: d,
					width: f,
					top: _,
					height: _ === void 0 ? void 0 : It,
					translateY: ee,
					isDragging: a,
					isPending: p,
					isGroup: h,
					isChild: e.parent !== null,
					isSelected: g.isSelected,
					isHighlighted: g.isHighlighted,
					isInvalid: a && un,
					interactive: !S,
					showHandles: !S && C,
					ariaLabel: _t.bar(e.task, g.start, g.end),
					classNames: I,
					className: ft?.(e.task),
					style: pt?.(e.task),
					handlers: S ? null : Jt(e.task.id, t, G ? q(t) + e.lane * W + N / 2 : void 0),
					onKeyDown: (n) => Yt(n, e.task, t),
					children: at ? at(g) : e.task.label
				})
			]
		}, e.task.id);
	}, wn = (e, t) => {
		let n = e.kind === "group", r = () => St(e.task.id), i = t === ln;
		return /* @__PURE__ */ l("div", {
			"data-gantt": "row",
			"data-row-index": t,
			"data-task-id": e.task.id,
			"data-kind": e.kind,
			"data-drop-target": i || void 0,
			"data-has-selection": Qt && e.bars.some((e) => Ct.has(e.task.id)) || void 0,
			className: M("gantt-row absolute left-0 flex border-b border-[var(--gantt-grid-color)]", t % 2 == 1 ? "bg-[var(--gantt-row-alt-bg)]" : "bg-[var(--gantt-bg)]", "hover:bg-[var(--gantt-row-hover-bg)]", I.row, n && I.rowGroup, e.kind === "child" && I.rowChild, i && I.rowDropTarget),
			style: {
				top: F + t * N,
				height: N,
				width: Mt
			},
			children: [/* @__PURE__ */ l("div", {
				"data-gantt": "sidebar-cell",
				className: M("gantt-sidebar-cell sticky left-0 z-20 flex shrink-0 items-center gap-1 border-r border-[var(--gantt-grid-major-color)] bg-inherit pr-2 text-sm", I.sidebarCell),
				style: {
					width: P,
					paddingLeft: 8 + e.depth * 20
				},
				children: [n ? /* @__PURE__ */ c("button", {
					type: "button",
					"data-gantt": "toggle",
					"aria-expanded": e.expanded,
					"aria-label": e.expanded ? _t.collapse : _t.expand,
					onClick: r,
					className: M("gantt-toggle flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--gantt-muted)] hover:bg-[var(--gantt-toggle-hover-bg)]", I.toggle),
					children: /* @__PURE__ */ c("svg", {
						width: "10",
						height: "10",
						viewBox: "0 0 10 10",
						"aria-hidden": !0,
						style: { transform: e.expanded ? "rotate(90deg)" : void 0 },
						children: /* @__PURE__ */ c("path", {
							d: "M3 1l4 4-4 4",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "1.5"
						})
					})
				}) : /* @__PURE__ */ c("span", {
					className: "h-5 w-5 shrink-0",
					"aria-hidden": !0
				}), /* @__PURE__ */ c("div", {
					"data-gantt": "sidebar-label",
					className: M("gantt-sidebar-label min-w-0 flex-1 truncate", n && "cursor-pointer font-medium", I.sidebarLabel),
					onClick: n ? r : void 0,
					children: ot ? ot({
						task: e.task,
						row: e,
						isGroup: n,
						expanded: e.expanded,
						toggle: r
					}) : e.task.label
				})]
			}), /* @__PURE__ */ l("div", {
				"data-gantt": "timeline-cell",
				className: M("gantt-timeline-cell relative shrink-0", I.timelineCell),
				style: { width: kt },
				children: [vn(e.key, e), e.bars.map((n) => Cn({
					task: n.task,
					parent: n.parent,
					lane: 0
				}, t, e, null))]
			})]
		}, e.key);
	}, Tn = (e) => {
		let t = e.index, n = t === ln, r = Qt && e.bars.some((e) => Ct.has(e.task.id));
		return /* @__PURE__ */ l("div", {
			"data-gantt": "row",
			"data-row-index": t,
			"data-row-id": e.row.id,
			"data-kind": "resource",
			"data-lanes": e.laneCount,
			"data-drop-target": n || void 0,
			"data-has-selection": r || void 0,
			className: M("gantt-row absolute left-0 flex border-b border-[var(--gantt-grid-color)]", t % 2 == 1 ? "bg-[var(--gantt-row-alt-bg)]" : "bg-[var(--gantt-bg)]", "hover:bg-[var(--gantt-row-hover-bg)]", I.row, n && I.rowDropTarget),
			style: {
				top: F + e.top,
				height: e.height,
				width: Mt
			},
			children: [/* @__PURE__ */ c("div", {
				"data-gantt": "sidebar-cell",
				className: M("gantt-sidebar-cell sticky left-0 z-20 flex shrink-0 items-start border-r border-[var(--gantt-grid-major-color)] bg-inherit px-2 text-sm", I.sidebarCell),
				style: { width: P },
				children: /* @__PURE__ */ c("div", {
					"data-gantt": "sidebar-label",
					className: M("gantt-sidebar-label flex min-w-0 flex-1 items-center", I.sidebarLabel),
					style: { height: N },
					children: /* @__PURE__ */ c("div", {
						className: "min-w-0 flex-1 truncate",
						children: st ? st({
							row: e.row,
							index: t,
							tasks: e.bars.map((e) => e.task),
							laneCount: e.laneCount,
							hasSelection: r
						}) : e.row.label
					})
				})
			}), /* @__PURE__ */ l("div", {
				"data-gantt": "timeline-cell",
				className: M("gantt-timeline-cell relative shrink-0", I.timelineCell),
				style: { width: kt },
				children: [
					vn(e.key, e.row),
					hn.get(t)?.map((e) => bn(`pending-ghost-${e.id}`, e.start, e.end, e.lane)),
					e.bars.map((n) => Cn(n, t, qe(n), e.row))
				]
			})]
		}, e.key);
	}, En = (e) => {
		if (G) {
			let t = G.rows[e];
			return t ? Tn(t) : null;
		}
		let t = K[e];
		return t ? wn(t, e) : null;
	}, Dn = [];
	for (let e = Rt.start; e < Rt.end; e++) Dn.push(En(e));
	let On = $?.session.originRowIndex;
	return On !== void 0 && (On < Rt.start || On >= Rt.end) && Dn.push(En(On)), /* @__PURE__ */ l("div", {
		ref: Xt,
		"data-gantt": "root",
		"data-dragging": $ ? $.session.kind : void 0,
		className: M("gantt-root relative overflow-hidden", mt, I.root),
		style: yn,
		children: [/* @__PURE__ */ c("div", {
			ref: L,
			"data-gantt": "scroller",
			className: M("gantt-scroller relative h-full w-full overflow-auto", I.scroller),
			onScroll: bt,
			onWheel: en,
			children: /* @__PURE__ */ l("div", {
				className: "relative",
				style: {
					width: Mt,
					height: F + Nt
				},
				onClick: z ? $t : void 0,
				children: [
					/* @__PURE__ */ c(He, {
						tiers: jt,
						scale: X,
						headerHeight: F,
						sidebarWidth: P,
						timelineWidth: kt,
						window: Z,
						classNames: I,
						renderHeaderCell: ct,
						renderSidebarHeader: lt,
						showTicks: dt,
						nowMarker: on && it ? {
							left: an,
							content: it(v(rn, b))
						} : null
					}),
					/* @__PURE__ */ l("div", {
						"data-gantt": "grid",
						"aria-hidden": !0,
						className: M("gantt-grid pointer-events-none absolute z-[1]", I.grid),
						style: {
							left: P,
							top: F,
							width: kt,
							height: Nt
						},
						children: [sn.map((e) => /* @__PURE__ */ c("div", {
							"data-gantt": "grid-line",
							"data-major": e.major || void 0,
							className: M("gantt-grid-line absolute inset-y-0 w-px", e.major ? "bg-[var(--gantt-grid-major-color)]" : "bg-[var(--gantt-grid-color)]", I.gridLine, e.major && I.gridLineMajor),
							style: { left: e.left }
						}, e.key)), on && /* @__PURE__ */ c("div", {
							"data-gantt": "now",
							className: M("gantt-now-line absolute inset-y-0 z-10 w-px bg-[var(--gantt-now-color)]", I.nowLine),
							style: { left: an }
						})]
					}),
					dn && $ && /* @__PURE__ */ c("div", {
						"data-gantt": "drop-indicator",
						"data-invalid": un || void 0,
						"aria-hidden": !0,
						className: M("gantt-drop-indicator pointer-events-none absolute z-[3] rounded-md", I.dropIndicator),
						style: {
							left: P + y(X, $.result.start),
							width: Math.max(2, y(X, $.result.end) - y(X, $.result.start)),
							top: F + q($.result.rowIndex) + fn($.result.rowIndex === $.session.originRowIndex ? G?.barsById.get($.session.taskId)?.lane ?? 0 : 0),
							height: pn
						}
					}),
					/* @__PURE__ */ c(ze, {
						links: xn,
						rects: Sn,
						left: P,
						top: F,
						width: kt,
						height: Nt,
						classNames: I
					}),
					Dn
				]
			})
		}), A && H.length > 0 && (Xe ? Xe({
			changes: H,
			commit: tn,
			discard: nn
		}) : Ye && /* @__PURE__ */ c(Le, {
			changes: H,
			commit: tn,
			discard: nn,
			labels: _t,
			classNames: I
		}))]
	});
}
var Ye = e(Je);
//#endregion
export { m as DAY, S as DEFAULT_HEADER_TIERS, Ye as Gantt, p as HOUR, f as MINUTE, h as WEEK, u as applyTaskChange, d as applyTaskChanges, Ce as buildHeaderTicks, Te as buildResourceLayout, se as clipRanges, ye as computeDrag, be as computeKeyboardStep, ie as computeRange, ee as createTimeScale, E as findTask, De as flattenRows, Oe as getDropPosition, le as linkPath, y as msToPx, me as nearestEdge, Fe as nextSelection, we as packLanes, te as pxToMs, ue as selectLinks, x as snapTime, pe as snapToGrid, de as snapUnitMs, v as toDateTime, oe as toIntervals, _ as toMs };

//# sourceMappingURL=index.js.map