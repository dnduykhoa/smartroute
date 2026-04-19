import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService, geocodingService, routingService } from '../../services/api';
import {
	LayoutDashboard,
	LogOut,
	Package,
	Route,
	Users,
	Warehouse,
	MapPinned,
	Truck,
	X,
	MapPin,
	Clock,
} from 'lucide-react';

const STORAGE_KEY = 'admin_imported_orders';

const WAREHOUSE = {
	name: 'Tòa S502, Nguyễn Xiển, Vinhomes Grand Park, Phường Long Bình',
	lat: 10.8422,
	lng: 106.8359,
};

// Expanded WARD_COORDS covering main wards across HCMC districts
const WARD_COORDS = {
	// TP Thủ Đức wards
	'long binh': { lat: 10.841, lng: 106.833 },
	'long thanh my': { lat: 10.853, lng: 106.84 },
	'tang nhon phu a': { lat: 10.848, lng: 106.79 },
	'tang nhon phu b': { lat: 10.844, lng: 106.795 },
	'hiep phu': { lat: 10.847, lng: 106.773 },
	'phuoc long a': { lat: 10.806, lng: 106.793 },
	'phuoc long b': { lat: 10.827, lng: 106.792 },
	'binh tho': { lat: 10.85, lng: 106.761 },
	'linh trung': { lat: 10.873, lng: 106.798 },
	'linh xuan': { lat: 10.886, lng: 106.771 },
	
	// Quận 1 wards
	'ben thanh': { lat: 10.7765, lng: 106.7009 },
	'da kao': { lat: 10.788, lng: 106.711 },
	'nguyen hue': { lat: 10.774, lng: 106.704 },
	
	// Quận 6 wards
	'phuong 13': { lat: 10.762, lng: 106.656 },
	'phuong 14': { lat: 10.766, lng: 106.659 },
	'phuong 4': { lat: 10.754, lng: 106.679 },
	'phuong 8': { lat: 10.786, lng: 106.689 },
	
	// Quận 7 wards
	'tan phu': { lat: 10.738, lng: 106.726 },
	'tan hung': { lat: 10.747, lng: 106.743 },
	'tan thuan': { lat: 10.755, lng: 106.712 },
	
	// General fallback
	'sai gon': { lat: 10.7765, lng: 106.7009 },
	'ho chi minh': { lat: 10.762, lng: 106.687 },
};

function normalizeText(value) {
	return String(value || '')
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function haversineDistance(a, b) {
	const toRad = (deg) => (deg * Math.PI) / 180;
	const R = 6371;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);

	const aa =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
	return R * c;
}

function bearingFromWarehouse(target) {
	const y = Math.sin((target.lng - WAREHOUSE.lng) * (Math.PI / 180)) * Math.cos(target.lat * (Math.PI / 180));
	const x =
		Math.cos(WAREHOUSE.lat * (Math.PI / 180)) * Math.sin(target.lat * (Math.PI / 180)) -
		Math.sin(WAREHOUSE.lat * (Math.PI / 180)) *
			Math.cos(target.lat * (Math.PI / 180)) *
			Math.cos((target.lng - WAREHOUSE.lng) * (Math.PI / 180));
	const brng = (Math.atan2(y, x) * 180) / Math.PI;
	return (brng + 360) % 360;
}

function findWardCoordinate(ward) {
	const normalizedWard = normalizeText(ward);
	const key = Object.keys(WARD_COORDS).find((item) => normalizedWard.includes(item));
	return key ? WARD_COORDS[key] : null;
}

function buildGeocodeQueries(order) {
	const address = String(order?.address || '').trim();
	const ward = String(order?.ward || '').trim();
	const district = String(order?.district || '').trim();
	const city = String(order?.city || '').trim();
	const cityOrDefault = city || 'Ho Chi Minh';
	const queries = [];

	if (address || ward) {
		queries.push([address, ward, district, cityOrDefault, 'Vietnam'].filter(Boolean).join(', '));
	}
	if (ward) {
		queries.push([ward, district, cityOrDefault, 'Vietnam'].filter(Boolean).join(', '));
	}
	if (address) {
		queries.push([address, cityOrDefault, 'Vietnam'].filter(Boolean).join(', '));
	}

	return Array.from(new Set(queries.filter(Boolean)));
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enrichOrdersWithRealCoordinates(orders) {
	const result = [];

	for (const order of orders) {
		const queries = buildGeocodeQueries(order);
		let coord = null;

		for (const query of queries) {
			try {
				const response = await geocodingService.search(query);
				const resolved = response?.data?.result;
				const source = response?.data?.source;
				if (resolved) {
					coord = resolved;
					break;
				}

				if (source === 'degraded' || source === 'upstream_unavailable') {
					break;
				}

				await sleep(120);
			} catch {
				// Continue trying next query/fallback.
				await sleep(120);
			}
		}

		if (!coord) {
			coord = findWardCoordinate(order.ward);
		}

		result.push({
			...order,
			coord: coord || null,
		});
	}

	return result;
}

function angleDiff(a, b) {
	const diff = Math.abs(a - b) % 360;
	return diff > 180 ? 360 - diff : diff;
}

function optimizeRouteLines(ordersByMethod) {
	const located = [];
	const notLocated = [];

	ordersByMethod.forEach((order) => {
		const coord = order.coord || findWardCoordinate(order.ward);
		if (!coord) {
			notLocated.push(order);
			return;
		}

		const distance = haversineDistance(WAREHOUSE, coord);
		const bearing = bearingFromWarehouse(coord);
		located.push({
			...order,
			coord,
			distance,
			bearing,
		});
	});

	located.sort((a, b) => {
		if (a.bearing === b.bearing) return a.distance - b.distance;
		return a.bearing - b.bearing;
	});

	const lines = [];
	located.forEach((item) => {
		let bestLine = null;
		let bestScore = Number.POSITIVE_INFINITY;

		lines.forEach((line) => {
			const aDiff = angleDiff(item.bearing, line.avgBearing);
			const distGap = Math.abs(item.distance - line.maxDistance);
			// Increased tolerances: bearing ±50°, distance ≤15km, weighted scoring
			const score = aDiff * 1.5 + distGap * 0.8;

			if (aDiff <= 50 && distGap <= 15 && score < bestScore) {
				bestScore = score;
				bestLine = line;
			}
		});

		if (!bestLine) {
			lines.push({
				id: `L${lines.length + 1}`,
				avgBearing: item.bearing,
				maxDistance: item.distance,
				stops: [item],
			});
			return;
		}

		bestLine.stops.push(item);
		bestLine.avgBearing =
			bestLine.stops.reduce((sum, stop) => sum + stop.bearing, 0) / bestLine.stops.length;
		bestLine.maxDistance = Math.max(bestLine.maxDistance, item.distance);
	});

	// Second pass: merge very close lines if they're nearby in distance too
	for (let i = 0; i < lines.length; i++) {
		for (let j = i + 1; j < lines.length; j++) {
			const line1 = lines[i];
			const line2 = lines[j];
			const bearingDiff = angleDiff(line1.avgBearing, line2.avgBearing);
			const distanceDiff = Math.abs(line1.maxDistance - line2.maxDistance);

			// Aggressive merge: if lines are within 40° bearing and 12km distance
			if (bearingDiff <= 40 && distanceDiff <= 12) {
				line1.stops.push(...line2.stops);
				line1.avgBearing =
					line1.stops.reduce((sum, stop) => sum + stop.bearing, 0) / line1.stops.length;
				line1.maxDistance = Math.max(line1.maxDistance, line2.maxDistance);
				lines.splice(j, 1);
				j--;
			}
		}
	}

	// Renumber lines after merging
	lines.forEach((line, index) => {
		line.id = `L${index + 1}`;
	});

	lines.forEach((line) => {
		line.stops.sort((a, b) => a.distance - b.distance);
	});

	if (notLocated.length) {
		lines.push({
			id: `L${lines.length + 1}`,
			unknown: true,
			stops: notLocated,
			avgBearing: null,
			maxDistance: null,
		});
	}

	return lines;
}

async function optimizeLineWithOsrm(line) {
	if (line.unknown || line.stops.length <= 1) {
		return { ...line, osrmOptimized: false };
	}

	try {
		const coords = [
			`${WAREHOUSE.lng},${WAREHOUSE.lat}`,
			...line.stops.map((stop) => `${stop.coord.lng},${stop.coord.lat}`),
		].join(';');

		const response = await routingService.trip(coords);
		const data = response?.data?.result;
		
		// OSRM fallback - log and continue
		if (!data || !Array.isArray(data.waypoints)) {
			console.warn(`[AdminShipping] OSRM fallback for ${line.id}: no valid waypoints`);
			return { ...line, osrmOptimized: false, usedHeuristic: true };
		}

		// waypoints[0] is warehouse, remaining waypoints map to input stops by index
		const rankedStops = line.stops
			.map((stop, index) => {
				const waypoint = data.waypoints[index + 1];
				return {
					...stop,
					waypointIndex: typeof waypoint?.waypoint_index === 'number' ? waypoint.waypoint_index : index + 1,
				};
			})
			.sort((a, b) => a.waypointIndex - b.waypointIndex)
			.map(({ waypointIndex, ...rest }) => rest);

		const optimized = {
			...line,
			stops: rankedStops,
			osrmOptimized: true,
			tripDistanceKm: data.trips?.[0]?.distance ? Number(data.trips[0].distance / 1000).toFixed(1) : null,
		};
		
		console.log(`[AdminShipping] OSRM optimized ${line.id}: ${optimized.tripDistanceKm}km, ${data.waypoints.length} waypoints`);
		return optimized;
	} catch (error) {
		console.error(`[AdminShipping] OSRM error for ${line.id}: ${error.message}`);
		return { ...line, osrmOptimized: false, usedHeuristic: true, error: error.message };
	}
}

async function optimizeAllLinesWithOsrm(lines) {
	return Promise.all(lines.map((line) => optimizeLineWithOsrm(line)));
}

export default function AdminShipping() {
	const navigate = useNavigate();
	const user = authService.getUser();
	const roleName = user?.role?.name?.toLowerCase();
	const isAdminOrModerator = ['admin', 'moderator'].includes(roleName);

	if (!authService.isLoggedIn()) {
		navigate('/login');
		return null;
	}

	if (!isAdminOrModerator) {
		navigate('/');
		return null;
	}

	const handleLogout = () => {
		authService.logout();
		navigate('/');
	};

	const initials = (user?.fullName || user?.username || 'AD').slice(0, 2).toUpperCase();

	const importedOrders = useMemo(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			const parsed = raw ? JSON.parse(raw) : [];
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}, []);

	const [resolvedOrders, setResolvedOrders] = useState(importedOrders);
	const [isGeocoding, setIsGeocoding] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function geocodeImportedOrders() {
			setIsGeocoding(true);
			const resolved = await enrichOrdersWithRealCoordinates(importedOrders);
			if (!cancelled) {
				setResolvedOrders(resolved);
				setIsGeocoding(false);
			}
		}

		geocodeImportedOrders();

		return () => {
			cancelled = true;
		};
	}, [importedOrders]);

	const onlineOrdersResolved = useMemo(
		() => resolvedOrders.filter((o) => String(o.method).toLowerCase() === 'online'),
		[resolvedOrders]
	);
	const offlineOrdersResolved = useMemo(
		() => resolvedOrders.filter((o) => String(o.method).toLowerCase() === 'offline'),
		[resolvedOrders]
	);

	const baseOnlineLines = useMemo(() => optimizeRouteLines(onlineOrdersResolved), [onlineOrdersResolved]);
	const baseOfflineLines = useMemo(() => optimizeRouteLines(offlineOrdersResolved), [offlineOrdersResolved]);

	const [onlineLines, setOnlineLines] = useState(baseOnlineLines);
	const [offlineLines, setOfflineLines] = useState(baseOfflineLines);
	const [isOptimizing, setIsOptimizing] = useState(false);
	const [selectedLine, setSelectedLine] = useState(null);

	const hasUnknownLine = useMemo(() => {
		return [...onlineLines, ...offlineLines].some((line) => Boolean(line.unknown));
	}, [onlineLines, offlineLines]);

	useEffect(() => {
		let cancelled = false;

		async function runOsrmOptimization() {
			setIsOptimizing(true);
			const [optimizedOnline, optimizedOffline] = await Promise.all([
				optimizeAllLinesWithOsrm(baseOnlineLines),
				optimizeAllLinesWithOsrm(baseOfflineLines),
			]);

			if (!cancelled) {
				setOnlineLines(optimizedOnline);
				setOfflineLines(optimizedOffline);
				setIsOptimizing(false);
			}
		}

		runOsrmOptimization();

		return () => {
			cancelled = true;
		};
	}, [baseOnlineLines, baseOfflineLines]);

	return (
		<div className="min-h-screen flex bg-slate-100">
			<aside className="w-64 bg-slate-950 text-white flex flex-col shrink-0 shadow-xl">
				<div className="px-5 py-5 border-b border-slate-800">
					<Link to="/admin" className="flex items-center gap-3">
						<div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
							<LayoutDashboard className="w-5 h-5 text-white" />
						</div>
						<div>
							<p className="font-bold text-sm">SmartRoute</p>
							<p className="text-xs text-slate-400">
								{roleName === 'admin' ? 'Admin Panel' : 'Moderator Panel'}
							</p>
						</div>
					</Link>
				</div>

				<nav className="px-3 py-4 space-y-1 flex-1">
					<Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors">
						<LayoutDashboard className="w-4 h-4" />
						Dashboard
					</Link>
					<Link to="/admin/orders" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors">
						<Package className="w-4 h-4" />
						Quản lý đơn hàng
					</Link>
					<Link to="/admin/products" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors">
						<Package className="w-4 h-4" />
						Quản lý sản phẩm
					</Link>
					<Link to="/admin/shipping" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white">
						<Route className="w-4 h-4" />
						Điều phối giao hàng
					</Link>
					{roleName === 'admin' && (
						<Link to="/admin/users" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors">
							<Users className="w-4 h-4" />
							Quản lý người dùng
						</Link>
					)}
				</nav>

				<div className="px-3 py-4 border-t border-slate-800">
					<div className="flex items-center gap-3 px-3 py-2 mb-2">
						<div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
							{initials}
						</div>
						<div className="min-w-0">
							<p className="text-sm font-semibold text-slate-200 truncate">{user?.fullName || user?.username}</p>
							<p className="text-xs text-slate-500 truncate">{user?.email}</p>
						</div>
					</div>
					<button
						onClick={handleLogout}
						className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
					>
						<LogOut className="w-4 h-4" />
						Đăng xuất
					</button>
				</div>
			</aside>

			<div className="flex-1 min-w-0 flex flex-col">
				<header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
					<h1 className="text-slate-800 font-semibold">Admin Shipping - Tối ưu tuyến đường</h1>
					<Link to="/" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
						Về trang chủ
					</Link>
				</header>

				<main className="p-6 space-y-6">
					<div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
						<div className="flex items-center gap-2 text-slate-900 font-semibold mb-2">
							<Warehouse className="w-5 h-5 text-indigo-600" />
							Kho chính xuất phát
						</div>
						<p className="text-sm text-slate-600">{WAREHOUSE.name}</p>
						<p className="text-xs text-slate-500 mt-1">Tuyến được gom theo cùng hướng di chuyển và tối ưu thứ tự.</p>
						
						{isGeocoding && (
							<div className="flex items-center gap-2 text-xs text-blue-600 mt-2 bg-blue-50 px-3 py-2 rounded-lg">
								<div className="w-4 h-4 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin" />
								Đang đối chiếu địa chỉ với bản đồ thực tế...
							</div>
						)}
						{isOptimizing && (
							<div className="flex items-center gap-2 text-xs text-indigo-600 mt-2 bg-indigo-50 px-3 py-2 rounded-lg">
								<div className="w-4 h-4 border-2 border-indigo-400 border-t-indigo-600 rounded-full animate-spin" />
								Đang tối ưu tuyến (7-15 giây/tuyến - hãy chờ)...
							</div>
						)}
					</div>

					{hasUnknownLine && (
						<div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
							<p className="text-sm font-semibold text-amber-800">Có đơn hàng chưa định vị được phường</p>
							<p className="text-xs text-amber-700 mt-1">
								Hệ thống đã thử đối chiếu địa chỉ bằng bản đồ. Nếu vẫn chưa định vị,
								hãy bổ sung địa chỉ cụ thể hơn (số nhà, đường, phường, quận, thành phố).
							</p>
						</div>
					)}

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<section className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${isOptimizing ? 'opacity-60 pointer-events-none' : ''}`}>
							<h2 className="text-lg font-semibold text-indigo-700 mb-1">Đơn ONLINE</h2>
							<p className="text-sm text-slate-500 mb-4">{onlineOrdersResolved.length} đơn - {onlineLines.length} tuyến đề xuất</p>
							{onlineLines.length === 0 ? (
								<p className="text-sm text-slate-500">Chưa có đơn online để tối ưu tuyến.</p>
							) : (
								<div className="space-y-3">
									{onlineLines.map((line) => (
									<div key={line.id} className="border border-slate-200 rounded-xl p-4 cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all" onClick={() => setSelectedLine(line)}>
											<div className="flex items-center justify-between mb-2">
												<p className="font-medium text-slate-900">{line.id} {line.unknown ? '- Chưa định vị được phường' : ''}</p>
												<span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{line.stops.length} đơn</span>
											</div>
											{line.tripDistanceKm && (
												<p className="text-xs text-slate-500 mb-2">Quãng đường ước tính: {line.tripDistanceKm} km</p>
											)}
											<ol className="space-y-1 text-sm text-slate-600">
												<li className="text-slate-700 flex items-center gap-2"><MapPinned className="w-4 h-4 text-indigo-500" />Kho S502</li>
												{line.stops.map((stop, index) => (
													<li key={`${line.id}-${stop.orderCode}`}>
															{index + 1}. {stop.orderCode} - {stop.ward}{stop.district ? `, ${stop.district}` : ''}{stop.city ? `, ${stop.city}` : ''} - {stop.address}
													</li>
												))}
											</ol>
										</div>
									))}
								</div>
							)}
						</section>

						<section className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${isOptimizing ? 'opacity-60 pointer-events-none' : ''}`}>
							<h2 className="text-lg font-semibold text-emerald-700 mb-1">Đơn OFFLINE</h2>
							<p className="text-sm text-slate-500 mb-4">{offlineOrdersResolved.length} đơn - {offlineLines.length} tuyến đề xuất</p>
							{offlineLines.length === 0 ? (
								<p className="text-sm text-slate-500">Chưa có đơn offline để tối ưu tuyến.</p>
							) : (
								<div className="space-y-3">
									{offlineLines.map((line) => (
									<div key={line.id} className="border border-slate-200 rounded-xl p-4 cursor-pointer hover:bg-slate-50 hover:border-emerald-300 transition-all" onClick={() => setSelectedLine(line)}>
											<div className="flex items-center justify-between mb-2">
												<p className="font-medium text-slate-900">{line.id} {line.unknown ? '- Chưa định vị được phường' : ''}</p>
												<span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{line.stops.length} đơn</span>
											</div>
											{line.tripDistanceKm && (
												<p className="text-xs text-slate-500 mb-2">Quãng đường ước tính: {line.tripDistanceKm} km</p>
											)}
											<ol className="space-y-1 text-sm text-slate-600">
												<li className="text-slate-700 flex items-center gap-2"><MapPinned className="w-4 h-4 text-emerald-500" />Kho S502</li>
												{line.stops.map((stop, index) => (
													<li key={`${line.id}-${stop.orderCode}`}>
													{index + 1}. {stop.orderCode} - {stop.ward}{stop.district ? `, ${stop.district}` : ''}{stop.city ? `, ${stop.city}` : ''} - {stop.address}
													</li>
												))}
											</ol>
										</div>
									))}
								</div>
							)}
						</section>
					</div>

					<div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-sm text-indigo-900">
						<p className="font-semibold mb-1">Nguyên tắc gom tuyến:</p>
						<ul className="space-y-1">
							<li>1. Tách riêng đơn online và offline.</li>
							<li>2. Tính hướng đi từ kho đến phường giao hàng.</li>
							<li>3. Đơn cùng hướng và gần nhau sẽ được gom chung 1 line.</li>
							<li>4. Trong mỗi line, điểm giao được sắp theo thứ tự từ gần đến xa kho.</li>
						</ul>
						<p className="mt-2">Ví dụ: từ Long Thạnh Mỹ đến Sài Gòn, hệ thống sẽ gom thêm Tăng Nhơn Phú nếu cùng hướng.</p>
					</div>


					{/* Timeline Modal */}
					{selectedLine && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
							<div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
								{/* Header */}
								<div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
									<div>
										<h2 className="text-xl font-bold">{selectedLine.id} - Chi tiết tuyến đường</h2>
										<p className="text-sm text-indigo-100 mt-1">{selectedLine.stops.length} điểm giao hàng	{selectedLine.tripDistanceKm && ` • ${selectedLine.tripDistanceKm} km`}</p>
									</div>
									<button
										onClick={() => setSelectedLine(null)}
										className="p-1 hover:bg-indigo-500 rounded-lg transition-colors"
									>
										<X className="w-5 h-5" />
									</button>
								</div>

								{/* Timeline */}
								<div className="p-6 space-y-4">
									{/* Warehouse Start */}
									<div className="flex gap-4">
										<div className="flex flex-col items-center">
											<div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
												<Warehouse className="w-5 h-5" />
											</div>
											{selectedLine.stops.length > 0 && (
												<div className="w-1 flex-1 bg-gradient-to-b from-indigo-600 to-indigo-300 mt-2"></div>
											)}
										</div>
										<div className="pb-4">
											<h3 className="font-semibold text-slate-900">Xuất phát từ kho</h3>
											<p className="text-sm text-slate-500">{WAREHOUSE.name}</p>
										</div>
									</div>

									{/* Delivery Points */}
									{selectedLine.stops.map((stop, index) => (
										<div key={`${selectedLine.id}-${stop.orderCode}`} className="flex gap-4">
											<div className="flex flex-col items-center">
												<div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-semibold text-sm">
													{index + 1}
												</div>
												{index < selectedLine.stops.length - 1 && (
													<div className="w-1 h-12 bg-gradient-to-b from-emerald-600 to-emerald-300 mt-2"></div>
												)}
											</div>
											<div className="pb-4 pt-1 flex-1">
												<div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
													<div className="flex items-start justify-between gap-2">
														<div className="flex-1 min-w-0">
															<p className="font-semibold text-slate-900">{stop.orderCode}</p>
															<p className="text-sm text-slate-700 mt-1">{stop.product} ({stop.quantity} {stop.unit})</p>
															<p className="text-xs text-slate-500 mt-2" >
																<MapPin className="w-3 h-3 inline mr-1" />
																{stop.ward}{stop.district ? `, ${stop.district}` : ''}{stop.city ? `, ${stop.city}` : ''}
															</p>
															<p className="text-xs text-slate-600 mt-1">{stop.address}</p>
														</div>
														<div className="text-right flex-shrink-0">
															<span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
																stop.method === 'online'
																? 'bg-blue-100 text-blue-700'
																: 'bg-purple-100 text-purple-700'
															}`}>
																{stop.method}
															</span>
															<p className="text-xs text-slate-500 mt-1">SĐT: {stop.phone}</p>
														</div>
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}
			</main>
			</div>
		</div>
	);
}
