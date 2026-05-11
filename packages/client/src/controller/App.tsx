import type { ComponentChildren } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import {
  patch,
  activeOutput,
  setSource,
  setSourceArg,
  insertTransform,
  replaceTransform,
  removeTransform,
  setTransformArg,
  setSubChainSource,
  setSubChainSourceArg,
  setSubChainSourceArgChain,
  insertSubChainTransform,
  replaceSubChainTransform,
  removeSubChainTransform,
  setSubChainTransformArg,
  setSubChainTransformArgChain,
  setSourceArgChain,
  setTransformArgChain,
} from "./state/patchStore";
import { wsStatus, sessionId, sendShowCode } from "./state/wsStore";
import { Column } from "./components/Column";
import { ControlsColumn } from "./components/ControlsColumn";
import { CodeView } from "./components/CodeView";
import { CATEGORY_COLORS, PAGE_BG } from "./lib/constants";
import { getArrayFunctionDef } from "./lib/functionRegistry";
import type { FunctionNode, ArrayFnNode } from "./types";

const MAX_VISIBLE_COLS = 4;

// ── Recursive column builder ─────────────────────────────────────────────────
//
// Walks a list of transforms (at any nesting depth) and produces a flat list
// of column entries. When a blend/modulate node is expanded, the builder
// recurses into its sub-chain, inserting those columns immediately after.
//
// path = []      → transforms are from the main chain
// path = [2]     → transforms are from chain.transforms[2].subChain
// path = [2,1]   → transforms are from ...transforms[2].subChain.transforms[1].subChain

type ColEntry = { key: string; el: ComponentChildren };

function makeArrayFnCols(
  node: FunctionNode,
  keyPrefix: string,
  expandedArrayChains: Set<string>,
  setArgChain: (argIdx: number, chain: ArrayFnNode[]) => void,
): ColEntry[] {
  const cols: ColEntry[] = [];
  for (let argIdx = 0; argIdx < node.args.length; argIdx++) {
    const arg = node.args[argIdx];
    if (
      arg.values.length <= 1 ||
      arg.arrayChain.length === 0 ||
      !expandedArrayChains.has(arg.arrayId)
    )
      continue;
    const chain = arg.arrayChain;
    for (let fnIdx = 0; fnIdx < chain.length; fnIdx++) {
      const fnNode = chain[fnIdx];
      const capturedArgIdx = argIdx;
      const capturedFnIdx = fnIdx;
      cols.push({
        key: `arr-${keyPrefix}-a${capturedArgIdx}-f${capturedFnIdx}`,
        el: (
          <Column
            kind="array-fn"
            fnNode={fnNode}
            isLast={capturedFnIdx === chain.length - 1}
            onArgChange={(fnArgIdx, value) =>
              setArgChain(
                capturedArgIdx,
                chain.map((fn, k) =>
                  k === capturedFnIdx
                    ? {
                        ...fn,
                        args: fn.args.map((v, ai) =>
                          ai === fnArgIdx ? value : v,
                        ),
                      }
                    : fn,
                ),
              )
            }
            onRemove={() =>
              setArgChain(
                capturedArgIdx,
                chain.filter((_, k) => k !== capturedFnIdx),
              )
            }
            onAdd={(name) => {
              const fnDef = getArrayFunctionDef(name);
              const newFn: ArrayFnNode = {
                name,
                args: fnDef?.args.map((a) => a.default) ?? [],
              };
              setArgChain(capturedArgIdx, [...chain, newFn]);
            }}
          />
        ),
      });
    }
  }
  return cols;
}

function buildCols(
  chainId: string,
  transforms: FunctionNode[],
  path: number[],
  parentBlendColor: string | null,
  expandedBlends: Set<string>,
  toggleBlend: (id: string) => void,
  expandedArrayChains: Set<string>,
  toggleArrayChain: (id: string) => void,
): ColEntry[] {
  const cols: ColEntry[] = [];
  const isSubChain = parentBlendColor !== null;

  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    const childPath = [...path, i];
    const pathKey = childPath.join("-");
    const isBlend = t.type === "combine" || t.type === "combineCoord";
    const expanded = isBlend && !!t.blendId && expandedBlends.has(t.blendId);
    const ownColor = CATEGORY_COLORS[t.type];
    const toggle =
      isBlend && t.blendId ? () => toggleBlend(t.blendId!) : undefined;

    cols.push({
      key: `t-${pathKey}`,
      el: (
        <Column
          node={t}
          kind="transform"
          blendColor={parentBlendColor ?? undefined}
          subChainExpanded={expanded}
          expandedArgChains={expandedArrayChains}
          onReplace={
            isSubChain
              ? (name) => replaceSubChainTransform(chainId, path, i, name)
              : (name) => replaceTransform(chainId, i, name)
          }
          onRemove={
            isSubChain
              ? () => removeSubChainTransform(chainId, path, i)
              : () => removeTransform(chainId, i)
          }
          onArgChange={
            isSubChain
              ? (argI, values) =>
                  setSubChainTransformArg(chainId, path, i, argI, values)
              : (argI, values) => setTransformArg(chainId, i, argI, values)
          }
          onArgChainChange={
            isSubChain
              ? (argI, chain) =>
                  setSubChainTransformArgChain(chainId, path, i, argI, chain)
              : (argI, chain) => setTransformArgChain(chainId, i, argI, chain)
          }
          onAdd={
            isSubChain
              ? (name) => insertSubChainTransform(chainId, path, i + 1, name)
              : (name) => insertTransform(chainId, i + 1, name)
          }
          onToggleSubChain={toggle}
          onToggleArgChain={toggleArrayChain}
        />
      ),
    });

    cols.push(
      ...makeArrayFnCols(
        t,
        pathKey,
        expandedArrayChains,
        isSubChain
          ? (argIdx, chain) =>
              setSubChainTransformArgChain(chainId, path, i, argIdx, chain)
          : (argIdx, chain) => setTransformArgChain(chainId, i, argIdx, chain),
      ),
    );

    if (expanded && t.subChain) {
      cols.push({
        key: `src-${pathKey}`,
        el: (
          <Column
            node={t.subChain.source}
            kind="source"
            blendColor={ownColor}
            expandedArgChains={expandedArrayChains}
            onReplace={(name) => setSubChainSource(chainId, childPath, name)}
            onArgChange={(argI, values) =>
              setSubChainSourceArg(chainId, childPath, argI, values)
            }
            onArgChainChange={(argI, chain) =>
              setSubChainSourceArgChain(chainId, childPath, argI, chain)
            }
            onAdd={(name) =>
              insertSubChainTransform(chainId, childPath, 0, name)
            }
            onToggleArgChain={toggleArrayChain}
          />
        ),
      });

      cols.push(
        ...makeArrayFnCols(
          t.subChain.source,
          `src-${pathKey}`,
          expandedArrayChains,
          (argIdx, chain) =>
            setSubChainSourceArgChain(chainId, childPath, argIdx, chain),
        ),
      );

      cols.push(
        ...buildCols(
          chainId,
          t.subChain.transforms,
          childPath,
          ownColor,
          expandedBlends,
          toggleBlend,
          expandedArrayChains,
          toggleArrayChain,
        ),
      );
    }
  }

  return cols;
}

// ── LandscapeAdapter ─────────────────────────────────────────────────────────

function LandscapeAdapter({ children }: { children: ComponentChildren }) {
  const [isPortrait, setIsPortrait] = useState(
    () => window.innerHeight > window.innerWidth,
  );

  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    (screen.orientation as { lock?: (o: string) => Promise<void> })
      ?.lock?.("landscape")
      ?.catch(() => {});
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  if (!isPortrait) return <>{children}</>;

  return (
    <div
      style={{
        position: "fixed",
        width: "100vh",
        height: "100vw",
        top: "calc(50vh - 50vw)",
        left: "calc(50vw - 50vh)",
        transform: "rotate(90deg)",
        transformOrigin: "center center",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function PairingOverlay({ sessionId }: { sessionId: string }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: PAGE_BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        gap: 12,
        fontFamily: "monospace",
        zIndex: 200,
      }}
    >
      <div style={{ fontSize: 14, color: "#B0BEC5" }}>Waiting for display…</div>
      <div style={{ fontSize: 10, color: "#455A64" }}>session: {sessionId}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#FF8C00",
              animation: `pulse 1.2s ${i * 0.4}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

export function App() {
  const [codeVisible, setCodeVisible] = useState(false);
  const [showCodeOnDisplay, setShowCodeOnDisplay] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(100);

  // blendId of every blend/modulate node whose sub-chain is currently expanded
  const [expandedBlends, setExpandedBlends] = useState<Set<string>>(new Set());
  // arrayId of every arg array chain currently expanded
  const [expandedArrayChains, setExpandedArrayChains] = useState<Set<string>>(
    new Set(),
  );

  const chain = patch.value.chains.find(
    (c) => c.output === activeOutput.value,
  )!;
  const status = wsStatus.value;
  const sid = sessionId.value;

  const toggleBlend = useCallback((id: string) => {
    setExpandedBlends((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleArrayChain = useCallback((id: string) => {
    setExpandedArrayChains((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Build the flat column list (source + recursively expanded transforms)
  const cols: ColEntry[] = [
    {
      key: "src",
      el: (
        <Column
          node={chain.source}
          kind="source"
          expandedArgChains={expandedArrayChains}
          onReplace={(name) => setSource(chain.id, name)}
          onArgChange={(i, values) => setSourceArg(chain.id, i, values)}
          onArgChainChange={(i, c) => setSourceArgChain(chain.id, i, c)}
          onAdd={(name) => insertTransform(chain.id, 0, name)}
          onToggleArgChain={toggleArrayChain}
        />
      ),
    },
    ...makeArrayFnCols(
      chain.source,
      "src",
      expandedArrayChains,
      (argIdx, argChain) => setSourceArgChain(chain.id, argIdx, argChain),
    ),
    ...buildCols(
      chain.id,
      chain.transforms,
      [],
      null,
      expandedBlends,
      toggleBlend,
      expandedArrayChains,
      toggleArrayChain,
    ),
  ];

  const numCols = cols.length;
  const needsScroll = numCols > MAX_VISIBLE_COLS;
  const colFlex = needsScroll
    ? `0 0 calc(100% / ${MAX_VISIBLE_COLS})`
    : "1 1 0";

  const updateThumb = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const tw = clientWidth > 0 ? (clientWidth / scrollWidth) * 100 : 100;
    const tl =
      scrollWidth > clientWidth
        ? (scrollLeft / (scrollWidth - clientWidth)) * (100 - tw)
        : 0;
    setThumbLeft(tl);
    setThumbWidth(tw);
  };

  useEffect(() => {
    updateThumb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numCols]);

  return (
    <LandscapeAdapter>
      {status !== "paired" && sid && <PairingOverlay sessionId={sid} />}
      {!sid && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: PAGE_BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#E91E63",
            fontFamily: "monospace",
            fontSize: 12,
          }}
        >
          No session ID — scan the QR code from the display.
        </div>
      )}

      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: PAGE_BG,
          overflow: "hidden",
        }}
      >
        <style>{`.cols-scroll::-webkit-scrollbar { display: none; }`}</style>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            className="cols-scroll"
            ref={scrollRef}
            onScroll={updateThumb}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "row",
              overflowX: needsScroll ? "auto" : "hidden",
              overflowY: "hidden",
              scrollbarWidth: "none",
            }}
          >
            {cols.map(({ key, el }) => (
              <div
                key={key}
                style={{
                  flex: colFlex,
                  height: "100%",
                  overflow: "hidden",
                  minWidth: 0,
                }}
              >
                {el}
              </div>
            ))}
          </div>

          {needsScroll && (
            <div
              style={{
                height: 8,
                background: "#263238",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  height: "100%",
                  background: "#546E7A",
                  borderRadius: 4,
                  left: `${thumbLeft}%`,
                  width: `${thumbWidth}%`,
                  pointerEvents: "none",
                }}
              />
            </div>
          )}
        </div>

        <ControlsColumn
          codeVisible={codeVisible}
          onToggleCode={() => setCodeVisible((v) => !v)}
          showCodeOnDisplay={showCodeOnDisplay}
          onToggleShowCodeOnDisplay={() => setShowCodeOnDisplay((v) => {
            const next = !v;
            sendShowCode(next);
            return next;
          })}
        />
      </div>

      {codeVisible && <CodeView onClose={() => setCodeVisible(false)} />}
    </LandscapeAdapter>
  );
}
