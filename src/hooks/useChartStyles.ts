import { useState, useEffect } from 'react';
import { ChartStyles, defaultChartStyles } from '@/components/ChartStyleSettings';

const STORAGE_KEY = 'chart_style_presets';

interface ChartStylePreset {
  id: string;
  name: string;
  styles: ChartStyles;
  createdAt: string;
}

export function useChartStyles() {
  const [presets, setPresets] = useState<ChartStylePreset[]>([]);
  const [currentStyles, setCurrentStyles] = useState<ChartStyles>(defaultChartStyles);

  // プリセットの読み込み
  useEffect(() => {
    const savedPresets = localStorage.getItem(STORAGE_KEY);
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (error) {
        console.error('Error loading chart style presets:', error);
      }
    }
  }, []);

  // プリセットの保存
  const savePreset = (name: string, styles: ChartStyles) => {
    const newPreset: ChartStylePreset = {
      id: `preset_${Date.now()}`,
      name,
      styles,
      createdAt: new Date().toISOString(),
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
    return newPreset;
  };

  // プリセットの更新
  const updatePreset = (id: string, name: string, styles: ChartStyles) => {
    const updatedPresets = presets.map(preset =>
      preset.id === id
        ? { ...preset, name, styles }
        : preset
    );
    setPresets(updatedPresets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
  };

  // プリセットの削除
  const deletePreset = (id: string) => {
    const updatedPresets = presets.filter(preset => preset.id !== id);
    setPresets(updatedPresets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
  };

  // プリセットの適用
  const applyPreset = (id: string) => {
    const preset = presets.find(p => p.id === id);
    if (preset) {
      setCurrentStyles(preset.styles);
      return preset.styles;
    }
    return null;
  };

  // 最後に使用したスタイルの保存
  useEffect(() => {
    localStorage.setItem('last_used_chart_styles', JSON.stringify(currentStyles));
  }, [currentStyles]);

  return {
    presets,
    currentStyles,
    setCurrentStyles,
    savePreset,
    updatePreset,
    deletePreset,
    applyPreset,
  };
}