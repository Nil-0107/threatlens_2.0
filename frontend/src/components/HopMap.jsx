import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Server, Globe2, ShieldAlert } from 'lucide-react';

export default function HopMap({ hops = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  // Filter hops with valid coordinates
  const geoHops = hops.filter((h) => h.lat !== null && h.lon !== null && !h.is_internal);
  const internalHops = hops.filter((h) => h.is_internal);
  const originHop = hops.find((h) => h.is_likely_origin);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet map if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [25, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true,
      });

      // Dark modern CARTO Basemaps tile layer with provided API key
      const cartoKey = import.meta.env.VITE_CARTO_API_KEY || '';
      const tileUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers & polyline
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (geoHops.length === 0) {
      map.setView([25, 10], 2);
      return;
    }

    const latLngs = [];

    // Custom Icon Creators
    const createOriginIcon = () =>
      L.divIcon({
        className: 'custom-origin-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(239, 68, 68, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 22px; height: 22px; border-radius: 50%; background: #ef4444; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);"></div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

    const createRelayIcon = (order) =>
      L.divIcon({
        className: 'custom-relay-pin',
        html: `
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #3b82f6; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: bold; box-shadow: 0 0 8px rgba(59, 130, 246, 0.8);">
            ${order + 1}
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

    // Add markers
    geoHops.forEach((h) => {
      const pt = [h.lat, h.lon];
      latLngs.push(pt);

      const icon = h.is_likely_origin ? createOriginIcon() : createRelayIcon(h.hop_order);
      const marker = L.marker(pt, { icon }).addTo(map);

      const popupContent = `
        <div style="font-family: ui-sans-serif, system-ui; font-size: 12px; line-height: 1.4; color: #f8fafc; min-width: 180px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold; color: ${h.is_likely_origin ? '#ef4444' : '#38bdf8'};">
              ${h.is_likely_origin ? '⚠️ TRUE ORIGIN HOP' : `HOP #${h.hop_order + 1}`}
            </span>
            <span style="font-family: monospace; font-size: 10px; color: #94a3b8;">${h.ip}</span>
          </div>
          <div style="margin-bottom: 2px;"><b>Location:</b> ${h.city}, ${h.country}</div>
          <div style="margin-bottom: 2px;"><b>ISP:</b> ${h.isp || 'N/A'}</div>
          ${h.org ? `<div style="margin-bottom: 2px;"><b>Org:</b> ${h.org}</div>` : ''}
          ${h.reverse_dns ? `<div><b>DNS:</b> <span style="font-family: monospace; font-size: 11px;">${h.reverse_dns}</span></div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });

    // Draw route polyline
    if (latLngs.length > 1) {
      polylineRef.current = L.polyline(latLngs, {
        color: '#38bdf8',
        weight: 3,
        opacity: 0.85,
        dashArray: '6, 8',
      }).addTo(map);
    }

    // Auto-fit bounds
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    }

    // Trigger map resize fix
    setTimeout(() => map.invalidateSize(), 200);
  }, [hops]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-blue-400" />
            Origin Tracer: Received Header Geolocation Trail
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Chronological reconstruction of MTA hops from origin to mailbox gateway.
          </p>
        </div>

        {originHop && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            <span>
              Origin: <b>{originHop.ip}</b> ({originHop.city}, {originHop.country})
            </span>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-slate-800">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Internal Hops Badge Strip */}
      {internalHops.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
          <span className="font-semibold text-slate-400 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            Internal / Loopback Hops:
          </span>
          {internalHops.map((ih, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700"
            >
              Hop {ih.hop_order + 1}: {ih.ip} ({ih.city})
            </span>
          ))}
        </div>
      )}

      {/* Chronological Hop Details Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
            <tr>
              <th className="px-3 py-2.5">Hop #</th>
              <th className="px-3 py-2.5">Role</th>
              <th className="px-3 py-2.5">IP Address</th>
              <th className="px-3 py-2.5">Geolocation</th>
              <th className="px-3 py-2.5">ISP / ASN</th>
              <th className="px-3 py-2.5">Reverse DNS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/50 font-mono">
            {hops.map((h, i) => (
              <tr key={i} className={h.is_likely_origin ? 'bg-rose-500/5' : ''}>
                <td className="px-3 py-2 text-slate-400 font-bold">{h.hop_order + 1}</td>
                <td className="px-3 py-2">
                  {h.is_likely_origin ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                      ORIGIN
                    </span>
                  ) : h.is_internal ? (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      INTERNAL
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      RELAY
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-bold text-white">{h.ip}</td>
                <td className="px-3 py-2 text-slate-200">
                  {h.is_internal ? 'Local Network' : `${h.city}, ${h.country}`}
                </td>
                <td className="px-3 py-2 text-slate-400 truncate max-w-[180px]">{h.isp || 'N/A'}</td>
                <td className="px-3 py-2 text-slate-400 truncate max-w-[180px]">{h.reverse_dns || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

