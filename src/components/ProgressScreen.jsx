import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { submitCheckin } from '../services/api.js';
import DailyCheckinModal from './DailyCheckinModal.jsx';

export default function ProgressScreen({ profileData, weightHistory, onAddWeight, todayCheckin, onCheckinCompleted }) {
  const [newWeight, setNewWeight] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);

  // Helper para parsear fechas evitando cualquier desfase UTC→local
  const parseDate = (dateInput) => {
    if (!dateInput) return new Date();
    if (dateInput.toDate) return dateInput.toDate();
    const d = dateInput instanceof Date ? dateInput : new Date(
      typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.slice(0, 10))
        ? dateInput.slice(0, 10) + 'T12:00:00'
        : dateInput
    );
    // Reconstruir con getters locales para garantizar el día correcto
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return new Date(`${y}-${mo}-${dy}T12:00:00`);
  };

  // Preparamos los datos para el gráfico
  const chartData = (() => {
    // 1. Mapeamos los datos y normalizamos la fecha para agrupar
    let rawPoints = weightHistory.map(entry => {
      const dateObj = parseDate(entry.date);
      return {
        dateStr: format(dateObj, 'yyyy-MM-dd'),
        displayDate: format(dateObj, 'd MMM', { locale: es }),
        weight: parseFloat(entry.weight),
        fullDate: dateObj
      };
    });

    // 2. Agrupamos por día (si hay varios, nos quedamos con el último registrado)
    const grouped = rawPoints.reduce((acc, current) => {
      acc[current.dateStr] = current;
      return acc;
    }, {});

    let points = Object.values(grouped);

    // 4. Ordenamos por fecha real y exportamos timestamp para escala proporcional
    return points
      .sort((a, b) => a.fullDate - b.fullDate)
      .map(p => ({
        timestamp: p.fullDate.getTime(),
        date: p.displayDate,
        weight: p.weight
      }));
  })();

  const handleSave = (e) => {
    e.preventDefault();
    if (newWeight) {
      onAddWeight(parseFloat(newWeight));
      setNewWeight('');
      setIsAdding(false);
      
      if (!todayCheckin) {
        setShowCheckin(true);
      }
    }
  };

  const handleCheckinSubmit = async (data) => {
    try {
      await submitCheckin(data);
      setShowCheckin(false);
      if (onCheckinCompleted) onCheckinCompleted(data);
      alert("¡Gracias! Tu estado ha sido registrado.");
    } catch (error) {
      console.error(error);
      alert("Error guardando check-in");
    }
  };

  const currentWeight = chartData.length > 0 
    ? chartData[chartData.length - 1].weight 
    : (profileData.current_weight ? parseFloat(profileData.current_weight) : null);
    
  const startWeight = profileData.start_weight 
    ? parseFloat(profileData.start_weight) 
    : (chartData.length > 0 ? chartData[0].weight : null);
    
  const targetWeight = profileData.target_weight ? parseFloat(profileData.target_weight) : null;

  // Calculamos el progreso total
  const totalChange = (startWeight !== null && currentWeight !== null) ? (currentWeight - startWeight).toFixed(1) : 0;
  const isLossGoal = startWeight !== null && targetWeight !== null && startWeight > targetWeight;
  const isOnTrack = startWeight !== null ? (isLossGoal ? totalChange <= 0 : totalChange >= 0) : true;

  return (
    <div className="space-y-4">

      {/* Tarjeta de Resumen */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Tu Progreso</h2>

        <div className="grid grid-cols-3 gap-4 text-center mb-6">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase">Inicio</p>
            <p className="text-lg font-bold text-gray-700">{startWeight !== null ? `${startWeight} kg` : '--'}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-xs text-emerald-600 uppercase">Actual</p>
            <p className="text-2xl font-bold text-emerald-700">{currentWeight !== null ? `${currentWeight} kg` : '--'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase">Meta</p>
            <p className="text-lg font-bold text-gray-700">{targetWeight !== null ? `${targetWeight} kg` : '--'}</p>
          </div>
        </div>

        <div className={`text-center p-2 rounded-md ${startWeight === null || currentWeight === null || targetWeight === null ? 'bg-gray-100 text-gray-600' : isOnTrack ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          <span className="font-medium">
            {startWeight === null || currentWeight === null ? '--' : (totalChange > 0 ? '+' : '') + totalChange + ' kg'}
          </span>
          <span className="text-sm ml-1">desde el inicio</span>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-xl shadow-lg p-6 h-64">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Evolución</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                ticks={chartData.map(d => d.timestamp)}
                tickFormatter={(ts) => format(new Date(ts), 'd MMM', { locale: es })}
                tick={{ fontSize: 11, angle: -40, textAnchor: 'end', dy: 2, dx: -2 }}
                height={45}
                stroke="#9CA3AF"
                interval={0}
              />
              <YAxis
                domain={['dataMin - 2', 'dataMax + 2']}
                hide={false}
                tick={{ fontSize: 12 }}
                stroke="#9CA3AF"
                unit="kg"
              />
              <Tooltip
                labelFormatter={(ts) => format(new Date(ts), "d 'de' MMMM yyyy", { locale: es })}
                formatter={(value) => [`${value} kg`, 'Peso']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
              
              {/* Línea de Meta (Target Weight) */}
              {profileData.target_weight && (
                <ReferenceLine 
                  y={parseFloat(profileData.target_weight)} 
                  label={{ 
                    position: 'right', 
                    value: 'Meta', 
                    fill: '#f59e0b', 
                    fontSize: 12 
                  }} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3" 
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Botón para registrar peso */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold shadow-md hover:bg-emerald-700 transition"
          >
            ⚖️ Registrar Peso de Hoy
          </button>
        ) : (
          <form onSubmit={handleSave} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Ej: 80.5"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 h-10"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 h-10"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>

      {showCheckin && (
        <DailyCheckinModal 
          onSubmit={handleCheckinSubmit} 
          onClose={() => setShowCheckin(false)} 
        />
      )}
    </div>
  );
}