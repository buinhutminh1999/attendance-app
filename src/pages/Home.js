// src/pages/Home.js

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Typography,
  Paper,
  Grid,
  Tooltip,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  LocalizationProvider,
  DatePicker,
} from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { startOfDay, endOfDay } from "date-fns";
import {
  Print,
  Search,
} from "@mui/icons-material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";

import FileUpload from "../components/FileUpload";
import DepartmentFilter from "../components/DepartmentFilter";
import AttendanceTable from "../components/AttendanceTable";
import {
  convertExcelDateToJSDate,
  convertExcelTimeToTimeString,
} from "../utils/dateUtils";
import { printStyledAttendance } from "../utils/printUtils";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useSnackbar } from "notistack";
import PeopleIcon from "@mui/icons-material/People";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import * as XLSX from "xlsx";

const WEEKDAY = ["Chủ Nhật", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"];

// parse "DD/MM/YYYY" -> Date object
const parseDate = (s) => {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
};

// to JS date string "DD/MM/YYYY"
const toDateString = (val) => {
  if (typeof val === "string") return val;
  const d = val.toDate ? val.toDate() : val;
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

// useDebounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

export default function Home() {
  const theme = useTheme();
  const matchesXs = useMediaQuery(theme.breakpoints.down("xs")); // <600px
  const matchesSm = useMediaQuery(theme.breakpoints.down("sm")); // ≤ 960px
  const { enqueueSnackbar } = useSnackbar();

  // State chính
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [depts, setDepts] = useState([]);
  const [dept, setDept] = useState("all");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const [reasons, setReasons] = useState({});

  // Search state + debounced
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 300);

  // Pagination for card view: will pass into AttendanceTable
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // 1. Load attendance data (firestore)
  const loadAttendanceData = useCallback(async () => {
    try {
      const attSnap = await getDocs(collection(db, "attendance"));
      const all = attSnap.docs.map((d) => {
        const data = d.data();
        const dateStr = toDateString(data.Ngày);
        return {
          id: d.id,
          ...data,
          Ngày: dateStr,
          dateObj: parseDate(dateStr),
          S1: data.S1 || "",
          S2: data.S2 && data.S2 !== data.S1 ? data.S2 : "",
          C1: data.C1 || "",
          C2: data.C2 || "",
        };
      });
      setRows(all);
      setDepts(Array.from(new Set(all.map((r) => r["Tên bộ phận"]))));
    } catch {
      enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
    }
  }, [enqueueSnackbar]);

  // 2. Load reasons khi rows thay đổi
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "lateReasons"));
        const map = {};
        snap.forEach((d) => (map[d.id] = d.data()));
        setReasons(map);
      } catch {
        enqueueSnackbar("Lỗi khi tải lý do", { variant: "error" });
      }
    })();
  }, [enqueueSnackbar, rows]);

  // 3. Khi mount, load attendance
  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  // 4. Filter rows dựa trên dept, date range, search
  useEffect(() => {
    let tmp = [...rows];

    // filter dept
    if (dept !== "all") {
      tmp = tmp.filter((r) => r["Tên bộ phận"] === dept);
    }

    // filter date
    if (fromDate && toDate) {
      const start = startOfDay(fromDate);
      const end = endOfDay(toDate);
      tmp = tmp.filter((r) => {
        return r.dateObj >= start && r.dateObj <= end;
      });
    }

    // filter search debounced
    if (debouncedSearch.trim()) {
      const k = debouncedSearch.trim().toLowerCase();
      tmp = tmp.filter((r) =>
        Object.values(r).some((v) =>
          v?.toString().toLowerCase().includes(k)
        )
      );
    }

    setFiltered(tmp);
    // reset pagination
    setPage(0);
  }, [rows, dept, fromDate, toDate, debouncedSearch]);

  // 5. Khi user upload file
  async function handleFileUploadData(rawRows) {
    try {
      const formatted = rawRows.map((r) => {
        const dateStr = convertExcelDateToJSDate(r["Ngày"]);
        return {
          id: `${r["Tên nhân viên"]}_${dateStr.replace(/\//g, "-")}`,
          "Tên nhân viên": r["Tên nhân viên"],
          "Tên bộ phận": r["Tên bộ phận"],
          Ngày: dateStr,
          dateObj: parseDate(dateStr),
          S1: r.S1 ? convertExcelTimeToTimeString(r.S1) : "",
          S2: r.S2 ? convertExcelTimeToTimeString(r.S2) : "",
          C1: r.C1 ? convertExcelTimeToTimeString(r.C1) : "",
          C2: r.C2 ? convertExcelTimeToTimeString(r.C2) : "",
        };
      });
      await Promise.all(
        formatted.map((row) =>
          setDoc(doc(db, "attendance", row.id), row, { merge: true })
        )
      );
      enqueueSnackbar("Tải & lưu thành công", { variant: "success" });
      await loadAttendanceData();
    } catch {
      enqueueSnackbar("Lỗi khi tải file", { variant: "error" });
    }
  }

  // 6. Callback lưu lý do từ AttendanceTable
  const handleReasonSave = async (rowId, field, newVal) => {
    const oldVal = reasons[rowId]?.[field] || "";
    if (newVal.trim() === oldVal.trim()) return;
    try {
      await setDoc(
        doc(db, "lateReasons", rowId),
        { [field]: newVal.trim() },
        { merge: true }
      );
      enqueueSnackbar("Lưu lý do thành công", { variant: "success" });
      setReasons((prev) => ({
        ...prev,
        [rowId]: {
          ...prev[rowId],
          [field]: newVal.trim(),
        },
      }));
    } catch {
      enqueueSnackbar("Lỗi khi lưu lý do", { variant: "error" });
    }
  };

  // 7. Print
  const handlePrint = () => {
    if (!fromDate || !toDate) {
      enqueueSnackbar("Chọn đủ Từ ngày và Đến ngày để in", {
        variant: "warning",
      });
      return;
    }
    printStyledAttendance(
      filtered,
      dept === "all" ? "Tất cả" : dept,
      fromDate,
      toDate,
      includeSaturday,
      reasons
    );
  };

  // 8. Export Excel
  const handleExportExcel = () => {
    if (!filtered.length) {
      enqueueSnackbar("Không có dữ liệu để xuất", { variant: "info" });
      return;
    }
    // Chuẩn bị mảng JSON để xuất
    const dataToExport = filtered.map((r, idx) => ({
      STT: idx + 1,
      "Tên nhân viên": r["Tên nhân viên"],
      "Tên bộ phận": r["Tên bộ phận"],
      Ngày: r.Ngày,
      Thứ: WEEKDAY[parseDate(r.Ngày).getDay()],
      S1: r.S1 || "",
      S2: r.S2 || "",
      "Lý do trễ (Sáng)": (reasons[r.id]?.morning || ""),
      C1: r.C1 || "",
      C2: r.C2 || "",
      "Lý do trễ (Chiều)": (reasons[r.id]?.afternoon || ""),
    }));
    // Tạo sheet và workbook
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "attendance_export.xlsx");
  };

  // Spinner khi load ban đầu
  if (!rows.length) {
    return (
      <Box
        sx={{
          mt: 6,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Đang tải dữ liệu...</Typography>
      </Box>
    );
  }

  // Lấy ngày mới nhất để hiển thị
  const latestDate =
    rows.map((r) => r.Ngày).sort().slice(-1)[0] || "-";

  return (
    <Box sx={{ px: 2, pb: 4 }}>
      {/* ===================== Summary Cards ===================== */}
      {matchesXs ? (
        <Box
          sx={{
            display: "flex",
            overflowX: "auto",
            mb: 3,
          }}
        >
          {[
            {
              label: "Tổng số bản ghi",
              value: rows.length,
              color: "info.light",
              icon: <PeopleIcon fontSize="small" sx={{ mr: 1, color: "info.main" }} />,
            },
            {
              label: "Đã lọc",
              value: filtered.length,
              color: "warning.light",
              icon: <FilterAltIcon fontSize="small" sx={{ mr: 1, color: "warning.main" }} />,
            },
            {
              label: "Số phòng ban",
              value: depts.length,
              color: "success.light",
              icon: <BusinessIcon fontSize="small" sx={{ mr: 1, color: "success.main" }} />,
            },
            {
              label: "Ngày mới nhất",
              value: latestDate,
              color: "error.light",
              icon: <CalendarTodayIcon fontSize="small" sx={{ mr: 1, color: "error.main" }} />,
            },
          ].map((c, idx) => (
            <Paper
              key={idx}
              sx={{
                minWidth: 140,
                p: 2,
                bgcolor: c.color,
                textAlign: "center",
                mr: idx < 3 ? 1 : 0,
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="center">
                {c.icon}
                <Typography variant="subtitle2">{c.label}</Typography>
              </Box>
              <Typography fontWeight="bold">{c.value}</Typography>
            </Paper>
          ))}
        </Box>
      ) : (
        <Grid
          container
          spacing={3}
          mb={4}
          justifyContent="center"
        >
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                py: 3,
                textAlign: "center",
                bgcolor: "info.light",
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                mb={1}
              >
                <PeopleIcon
                  fontSize="small"
                  sx={{ mr: 1, color: "info.main" }}
                />
                <Typography variant="subtitle2">
                  Tổng số bản ghi
                </Typography>
              </Box>
              <Typography fontWeight="bold">{rows.length}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                py: 3,
                textAlign: "center",
                bgcolor: "warning.light",
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                mb={1}
              >
                <FilterAltIcon
                  fontSize="small"
                  sx={{ mr: 1, color: "warning.main" }}
                />
                <Typography variant="subtitle2">
                  Đã lọc
                </Typography>
              </Box>
              <Typography fontWeight="bold">{filtered.length}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                py: 3,
                textAlign: "center",
                bgcolor: "success.light",
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                mb={1}
              >
                <BusinessIcon
                  fontSize="small"
                  sx={{ mr: 1, color: "success.main" }}
                />
                <Typography variant="subtitle2">
                  Số phòng ban
                </Typography>
              </Box>
              <Typography fontWeight="bold">{depts.length}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                py: 3,
                textAlign: "center",
                bgcolor: "error.light",
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                mb={1}
              >
                <CalendarTodayIcon
                  fontSize="small"
                  sx={{ mr: 1, color: "error.main" }}
                />
                <Typography variant="subtitle2">
                  Ngày mới nhất
                </Typography>
              </Box>
              <Typography fontWeight="bold">{latestDate}</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ===================== Filter Panel ===================== */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight="bold">
            Bộ lọc
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm theo tên, bộ phận, ngày..."
              margin="normal"
              inputProps={{ "aria-label": "Tìm kiếm trong bảng chấm công" }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <Grid container spacing={1} alignItems="center" mt={1}>
              <Grid item xs={12}>
                <DepartmentFilter
                  depts={depts}
                  value={dept}
                  onChange={setDept}
                  labels={{ all: "Tất cả" }}
                />
              </Grid>
              <Grid item xs={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Từ ngày"
                    value={fromDate}
                    onChange={setFromDate}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth size="small" />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Đến ngày"
                    value={toDate}
                    onChange={setToDate}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth size="small" />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeSaturday}
                      onChange={(e) =>
                        setIncludeSaturday(e.target.checked)
                      }
                    />
                  }
                  label="In thêm Thứ 7"
                />
              </Grid>
              <Grid item xs={12}>
                <Tooltip
                  title={
                    !fromDate || !toDate
                      ? "Chọn đủ Từ ngày & Đến ngày"
                      : toDate < fromDate
                      ? "Đến ngày phải ≥ Từ ngày"
                      : ""
                  }
                  arrow
                >
                  <span>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Print />}
                      onClick={handlePrint}
                      disabled={
                        !fromDate || !toDate || toDate < fromDate
                      }
                    >
                      In bảng chấm công
                    </Button>
                  </span>
                </Tooltip>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExportExcel}
                >
                  Xuất Excel
                </Button>
              </Grid>
            </Grid>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* ===================== File Upload ===================== */}
      <Box mt={2}>
        <Paper sx={{ p: 2 }}>
          <Tooltip title="Chỉ chấp nhận .xlsx theo mẫu">
            <Typography fontWeight="bold" mb={1}>
              Tải file chấm công
            </Typography>
          </Tooltip>
          <FileUpload onFileUpload={handleFileUploadData} />
        </Paper>
      </Box>

      {/* ===================== AttendanceTable or No-data ===================== */}
      <Box mt={3}>
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <SentimentDissatisfiedIcon
              sx={{ fontSize: 48, color: "text.secondary" }}
            />
            <Typography variant="subtitle1" color="text.secondary">
              Không có kết quả khớp điều kiện
            </Typography>
          </Box>
        ) : (
          <AttendanceTable
            rows={filtered}
            includeSaturday={includeSaturday}
            reasons={reasons}
            onReasonSave={handleReasonSave}
            isMobile={false}
          />
        )}
      </Box>
    </Box>
  );
}
