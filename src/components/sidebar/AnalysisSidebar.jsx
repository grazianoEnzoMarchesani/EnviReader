import { useRef, useState } from 'react';
import { SIDEBAR_TABS, DATA_GROUPS, DATASETS, SCALE_TYPES } from '../../data/constants';
import { paletteGroups, findPalette } from '../../data/palettes';
import { makeId, uniqueName, decodePaletteCode, parsePaletteFile, paletteFilePayload } from '../../lib/paletteStore';
import { settingsFromState, parsePresetFile, presetFilePayload } from '../../lib/presetStore';
import { DEFAULT_PRESETS } from '../../data/defaultPresets';
import { useAppState } from '../../state/AppStateContext';
import { useI18n } from '../../i18n/I18nContext';
import Slider from '../controls/Slider';
import Toggle from '../controls/Toggle';
import Select from '../controls/Select';
import OptionButtons from '../controls/OptionButtons';
import PaletteSelector, { orderedColors } from '../controls/PaletteSelector';
import GradientEditor from '../controls/GradientEditor';

function DataTab() {
  const { state, set, toggle, setDataGroup } = useAppState();
  const { tr } = useI18n();

  // Prima del caricamento di un fileset i menu mostrano i placeholder del prototipo
  const loaded = state.dataGroups.length > 0;
  const dims = state.edxMeta?.dimensions;
  const groupOptions = loaded
    ? state.dataGroups.map((p) => ({ value: p, label: p === '' ? '/' : p }))
    : [];
  const datasetOptions = state.edxMeta
    ? state.edxMeta.variableNames.map((n) => ({ value: n, label: n }))
    : [];

  return (
    <>
      <Select
        label={tr('group_data_group')}
        value={state.dataGroup}
        options={groupOptions}
        onChange={(v) => (loaded ? setDataGroup(v) : set({ dataGroup: v }))}
      />
      <Select
        label={tr('group_dataset')}
        value={state.dataset}
        options={datasetOptions}
        onChange={(v) => set({ dataset: v })}
      />
      <Slider label={tr('slider_time')} value={state.time} min={0} max={Math.max(0, state.seriesLabels.length - 1) || (loaded ? 0 : 100)} onChange={(v) => set({ time: v })} />
      <Slider label={tr('slider_level')} value={state.level} min={0} max={dims ? Math.max(0, dims.z - 1) : 20} onChange={(v) => set({ level: v })} />
      <Slider label={tr('slider_sectionx')} value={state.sectionX} min={0} max={dims ? Math.max(0, dims.x - 1) : 100} onChange={(v) => set({ sectionX: v })} />
      <Slider label={tr('slider_sectiony')} value={state.sectionY} min={0} max={dims ? Math.max(0, dims.y - 1) : 100} onChange={(v) => set({ sectionY: v })} />
      <Slider
        label={tr('slider_section_angle')}
        value={state.sectionAngle}
        min={-90}
        max={90}
        unit="°"
        onChange={(v) => set({ sectionAngle: v === -90 ? 90 : v })}
      />
      <Toggle label={tr('toggle_follow_terrain')} on={state.followTerrain} onToggle={() => toggle('followTerrain')} />
      {state.followTerrain && (
        <>
          <Toggle label={tr('toggle_level_out')} on={state.levelOut} onToggle={() => toggle('levelOut')} />
          {state.levelOut && (
            <Slider
              label={tr('slider_level_out_height')}
              value={state.levelOutHeight}
              min={1}
              max={dims ? Math.max(1, dims.z - 1) : 20}
              onChange={(v) => set({ levelOutHeight: v })}
            />
          )}
        </>
      )}
    </>
  );
}



function WindTab() {
  const { state, set, toggle } = useAppState();
  const { tr } = useI18n();
  const styleOptions = [
    { key: 'arrows', label: tr('wind_style_arrows') },
    { key: 'streamlines', label: tr('wind_style_streamlines') },
    { key: 'combined', label: tr('wind_style_combined') },
  ];
  return (
    <>
      <div className="section">
        <div className="group-label">{tr('group_wind_style')}</div>
        <OptionButtons options={styleOptions} value={state.windStyle} onSelect={(v) => set({ windStyle: v })} />
      </div>
      <Slider label={tr('slider_wind_opacity')} value={state.windOpacity} min={0} max={100} unit="%" onChange={(v) => set({ windOpacity: v })} />
      <Slider label={tr('slider_wind_size')} value={state.windSize} min={0} max={100} unit="%" onChange={(v) => set({ windSize: v })} />
      <Slider label={tr('slider_wind_density')} value={state.windDensity} min={0} max={100} unit="%" onChange={(v) => set({ windDensity: v })} />
      <Toggle label={tr('toggle_wind_field')} on={state.showWindField} onToggle={() => toggle('showWindField')} />
    </>
  );
}

function PaletteTab() {
  const { state, set, toggle, openPaletteDropdown } = useAppState();
  const { tr } = useI18n();
  const fileRef = useRef(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeText, setCodeText] = useState('');
  const [importError, setImportError] = useState(false);
  const draft = state.paletteDraft;

  // "Personalizza": l'editor parte dalla palette che l'utente sta guardando,
  // inversione inclusa — mai da una tela bianca
  const openEditor = (target) => {
    const variant = target === 'diff' ? 'diff' : 'main';
    const active = findPalette(target === 'diff' ? state.diffPalette : state.palette, variant, state.customPalettes);
    const reversed = target === 'diff' ? state.diffPaletteReversed : state.paletteReversed;
    set({
      paletteDraft: { target, editingId: null, name: '', colors: orderedColors(active, reversed) },
      paletteOpen: false,
      diffPaletteOpen: false,
    });
  };

  const editCustom = (target, id) => {
    const p = state.customPalettes.find((x) => x.id === id);
    if (!p) return;
    set({
      paletteDraft: { target, editingId: id, name: p.name, colors: p.colors },
      paletteOpen: false,
      diffPaletteOpen: false,
    });
  };

  const deleteCustom = (id) =>
    set((s) => ({
      customPalettes: s.customPalettes.filter((p) => p.id !== id),
      ...(s.palette === id ? { palette: 'Turbo' } : {}),
      ...(s.diffPalette === id ? { diffPalette: 'RdBu' } : {}),
      ...(s.paletteDraft?.editingId === id ? { paletteDraft: null } : {}),
    }));

  const saveDraft = () =>
    set((s) => {
      const d = s.paletteDraft;
      const taken = s.customPalettes.filter((p) => p.id !== d.editingId).map((p) => p.name);
      const item = {
        id: d.editingId ?? makeId(),
        name: uniqueName(d.name.trim() || tr('custom_default_name'), taken),
        colors: d.colors,
      };
      return {
        customPalettes: d.editingId
          ? s.customPalettes.map((p) => (p.id === item.id ? item : p))
          : [...s.customPalettes, item],
        paletteDraft: null,
        // il draft è già orientato come lo si vede: si salva "dritto"
        ...(d.target === 'diff' ? { diffPalette: item.id, diffPaletteReversed: false } : { palette: item.id, paletteReversed: false }),
      };
    });

  const addPalettes = (items) =>
    set((s) => {
      const list = [...s.customPalettes];
      for (const it of items) {
        list.push({ id: makeId(), name: uniqueName(it.name || tr('custom_default_name'), list.map((p) => p.name)), colors: it.colors });
      }
      return { customPalettes: list };
    });

  const importFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const items = parsePaletteFile(await f.text());
    if (items) addPalettes(items);
    setImportError(!items);
  };

  const exportFile = () => {
    const blob = new Blob([paletteFilePayload(state.customPalettes)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'envireader-palette.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const addFromCode = () => {
    const item = decodePaletteCode(codeText);
    if (item) {
      addPalettes([item]);
      setCodeText('');
      setCodeOpen(false);
    }
    setImportError(!item);
  };

  const editorFor = (target) =>
    draft?.target === target && (
      <GradientEditor
        draft={draft}
        onChange={(patch) => set((s) => ({ paletteDraft: { ...s.paletteDraft, ...patch } }))}
        onSave={saveDraft}
        onCancel={() => set({ paletteDraft: null })}
      />
    );

  return (
    <>
      <div className="section">
        <div className="group-label">{tr('group_palette_main')}</div>
        <PaletteSelector
          groups={paletteGroups('main', state.customPalettes)}
          selectedId={state.palette}
          reversed={state.paletteReversed}
          open={state.paletteOpen}
          onToggleOpen={() => openPaletteDropdown('main')}
          onSelect={(id) => set({ palette: id, paletteOpen: false })}
          onEdit={(id) => editCustom('main', id)}
          onDelete={deleteCustom}
        />
        <button className="ghost-btn" onClick={() => toggle('paletteReversed')}>{tr('btn_reverse_palette')}</button>
        <button className="ghost-btn" onClick={() => openEditor('main')}>{tr('btn_customize_palette')}</button>
        {editorFor('main')}
      </div>
      <div className="section">
        <div className="group-label">{tr('group_palette_diff')}</div>
        <PaletteSelector
          variant="diff"
          groups={paletteGroups('diff', state.customPalettes)}
          selectedId={state.diffPalette}
          reversed={state.diffPaletteReversed}
          open={state.diffPaletteOpen}
          onToggleOpen={() => openPaletteDropdown('diff')}
          onSelect={(id) => set({ diffPalette: id, diffPaletteOpen: false })}
          onEdit={(id) => editCustom('diff', id)}
          onDelete={deleteCustom}
        />
        <button className="ghost-btn" onClick={() => toggle('diffPaletteReversed')}>{tr('btn_reverse_diff_palette')}</button>
        <button className="ghost-btn" onClick={() => openEditor('diff')}>{tr('btn_customize_palette')}</button>
        {editorFor('diff')}
      </div>
      <Toggle
        label={tr('toggle_diff_order')}
        extra={state.diffOrderAB ? tr('diff_order_ab') : tr('diff_order_ba')}
        on={state.diffOrderAB}
        onToggle={() => toggle('diffOrderAB')}
      />
      <div className="section">
        <div className="group-label">{tr('group_palettes_custom')}</div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importFile} />
        <button className="ghost-btn" onClick={() => fileRef.current?.click()}>{tr('btn_import_palettes')}</button>
        <button className="ghost-btn" disabled={!state.customPalettes.length} onClick={exportFile}>{tr('btn_export_palettes')}</button>
        {codeOpen ? (
          <div className="code-import-row">
            <input
              className="gradient-name"
              type="text"
              value={codeText}
              placeholder={tr('import_code_placeholder')}
              onChange={(e) => setCodeText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFromCode()}
            />
            <button className="ghost-btn primary" onClick={addFromCode}>{tr('btn_add')}</button>
          </div>
        ) : (
          <button className="ghost-btn" onClick={() => setCodeOpen(true)}>{tr('btn_import_code')}</button>
        )}
        {importError && <div className="gradient-hint error">{tr('import_invalid')}</div>}
      </div>
    </>
  );
}

function PresetsTab() {
  const { state, set, applyPreset } = useAppState();
  const { tr } = useI18n();
  const fileRef = useRef(null);
  const [name, setName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [importError, setImportError] = useState(false);

  // preset di fabbrica raggruppati per variabile: una riga, tre momenti del giorno
  const rows = [];
  for (const p of DEFAULT_PRESETS) {
    let row = rows.find((r) => r.varKey === p.varKey);
    if (!row) rows.push((row = { varKey: p.varKey, items: [] }));
    row.items.push(p);
  }

  const saveCurrent = () => {
    set((s) => ({
      customPresets: [
        ...s.customPresets,
        {
          id: makeId(),
          name: uniqueName(name.trim() || tr('custom_preset_default_name'), s.customPresets.map((p) => p.name)),
          settings: settingsFromState(s),
        },
      ],
    }));
    setName('');
  };

  const deletePreset = (id) => set((s) => ({ customPresets: s.customPresets.filter((p) => p.id !== id) }));

  const renamePreset = (id) => {
    set((s) => ({
      customPresets: s.customPresets.map((p) =>
        p.id === id
          ? { ...p, name: uniqueName(renameText.trim() || p.name, s.customPresets.filter((x) => x.id !== id).map((x) => x.name)) }
          : p,
      ),
    }));
    setRenamingId(null);
  };

  const importFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const data = parsePresetFile(await f.text());
    setImportError(!data);
    if (!data) return;
    set((s) => {
      // il file porta con sé le palette personalizzate usate: si aggiungono le mancanti
      const palettes = [...s.customPalettes];
      for (const p of data.palettes) if (!palettes.some((x) => x.id === p.id)) palettes.push(p);
      const presets = [...s.customPresets];
      for (const p of data.presets) {
        presets.push({ ...p, id: makeId(), name: uniqueName(p.name, presets.map((x) => x.name)) });
      }
      return { customPalettes: palettes, customPresets: presets };
    });
  };

  const exportFile = () => {
    const blob = new Blob([presetFilePayload(state.customPresets, state.customPalettes)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'envireader-presets.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="section">
        <div className="group-label">{tr('group_presets_builtin')}</div>
        <div className="preset-list">
          {rows.map((row) => (
            <div key={row.varKey} className="preset-row">
              <span className="preset-var">{tr(row.varKey)}</span>
              <div className="preset-times">
                {row.items.map((p) => (
                  <button
                    key={p.id}
                    className="preset-btn"
                    title={`${tr(row.varKey)} · ${p.settings.hour}`}
                    onClick={() => applyPreset(p)}
                  >
                    {tr(p.timeKey)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="section">
        <div className="group-label">{tr('group_presets_custom')}</div>
        {state.customPresets.length === 0 && <div className="gradient-hint">{tr('presets_empty_hint')}</div>}
        <div className="preset-list">
          {state.customPresets.map((p) =>
            renamingId === p.id ? (
              <div key={p.id} className="code-import-row">
                <input
                  className="gradient-name"
                  type="text"
                  value={renameText}
                  autoFocus
                  onChange={(e) => setRenameText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && renamePreset(p.id)}
                />
                <button className="ghost-btn primary" onClick={() => renamePreset(p.id)}>{tr('btn_ok')}</button>
              </div>
            ) : (
              <div key={p.id} className="preset-row custom">
                <button className="preset-btn" onClick={() => applyPreset(p)}>{p.name}</button>
                <span className="palette-row-actions">
                  <button
                    className="palette-row-btn"
                    title={tr('title_edit_palette')}
                    onClick={() => { setRenamingId(p.id); setRenameText(p.name); }}
                  >✎</button>
                  <button className="palette-row-btn" title={tr('title_delete_palette')} onClick={() => deletePreset(p.id)}>×</button>
                </span>
              </div>
            ),
          )}
        </div>
        <div className="code-import-row">
          <input
            className="gradient-name"
            type="text"
            value={name}
            placeholder={tr('preset_name_placeholder')}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveCurrent()}
          />
          <button className="ghost-btn primary" onClick={saveCurrent}>{tr('btn_save_preset')}</button>
        </div>
      </div>
      <div className="section">
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importFile} />
        <button className="ghost-btn" onClick={() => fileRef.current?.click()}>{tr('btn_import_presets')}</button>
        <button className="ghost-btn" disabled={!state.customPresets.length} onClick={exportFile}>{tr('btn_export_presets')}</button>
        {importError && <div className="gradient-hint error">{tr('import_invalid')}</div>}
      </div>
    </>
  );
}

const TAB_PANELS = { data: DataTab, wind: WindTab, palette: PaletteTab, presets: PresetsTab };

export default function AnalysisSidebar() {
  const { state, set } = useAppState();
  const { tr } = useI18n();
  const Panel = TAB_PANELS[state.activeTab] || DataTab;

  return (
    <>
      <nav className="sidebar-tab-row">
        {SIDEBAR_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`sidebar-tab${state.activeTab === tab.key ? ' active' : ''}`}
            onClick={() => set({ activeTab: tab.key })}
          >
            {tr(tab.labelKey)}
          </button>
        ))}
      </nav>
      <div className="tab-panel">
        <Panel />
      </div>
    </>
  );
}
