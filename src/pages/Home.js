// src/pages/Home.js
import React, { useState, useEffect, useCallback } from "react";
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
  Stack,
  Tooltip,
  InputAdornment
} from "@mui/material";
import {
  LocalizationProvider,
  DatePicker
} from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { startOfDay, endOfDay } from "date-fns";
import { Print, Search } from "@mui/icons-material";

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
import { useFileUpload } from "../hooks/useFileUpload";

const toDateString = (val) => {
  if (typeof val === "string") return val;
  const d = val.toDate ? val.toDate() : val;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const parseDMY = (s) => {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
};

export default function Home() {
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [depts, setDepts] = useState([]);
  const [dept, setDept] = useState("all");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const { handleFileUpload } = useFileUpload(handleFileUploadData);

  const loadAttendanceData = useCallback(async () => {
    try {
      const attSnap = await getDocs(collection(db, "attendance"));
      const lateSnap = await getDocs(collection(db, "lateReasons"));
      const lateMap = {};
      lateSnap.forEach((d) => (lateMap[d.id] = d.data()));
      const all = attSnap.docs.map((d) => {
        const data = d.data();
        const dateStr = toDateString(data.Ngày);
        return {
          id: d.id,
          ...data,
          Ngày: dateStr,
          dateObj: parseDMY(dateStr),
          S1: data.S1 || "",
          S2: data.S2 && data.S2 !== data.S1 ? data.S2 : "",
          C1: data.C1 || "",
          C2: data.C2 || "",
          morning: lateMap[d.id]?.morning || "",
          afternoon: lateMap[d.id]?.afternoon || "",
        };
      });
      setRows(all);
      setDepts(Array.from(new Set(all.map((r) => r["Tên bộ phận"]))));
    } catch {
      enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
    }
  }, [enqueueSnackbar]);

  useEffect(() => { loadAttendanceData(); }, [loadAttendanceData]);

  useEffect(() => {
    let tmp = rows;
    if (dept !== "all") tmp = tmp.filter((r) => r["Tên bộ phận"] === dept);
    if (fromDate && toDate) {
      const start = startOfDay(fromDate);
      const end = endOfDay(toDate);
      tmp = tmp.filter((r) => r.dateObj >= start && r.dateObj <= end);
    }
    setFiltered(tmp);
  }, [rows, dept, fromDate, toDate]);

  async function handleFileUploadData(rawRows) {
    try {
      const formatted = rawRows.map((r) => {
        const dateStr = convertExcelDateToJSDate(r["Ngày"]);
        return {
          id: `${r["Tên nhân viên"]}_${dateStr.replace(/\//g, "-")}`,
          "Tên nhân viên": r["Tên nhân viên"],
          "Tên bộ phận": r["Tên bộ phận"],
          Ngày: dateStr,
          dateObj: parseDMY(dateStr),
          S1: r.S1 ? convertExcelTimeToTimeString(r.S1) : "",
          S2: r.S2 ? convertExcelTimeToTimeString(r.S2) : "",
          C1: r.C1 ? convertExcelTimeToTimeString(r.C1) : "",
          C2: r.C2 ? convertExcelTimeToTimeString(r.C2) : "",
          morning: "",
          afternoon: "",
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

  const handleReasonSave = async (rowId, field, value) => {
    try {
      await setDoc(doc(db, "lateReasons", rowId), { [field]: value }, { merge: true });
      enqueueSnackbar("Đã lưu lý do", { variant: "success" });
      await loadAttendanceData();
    } catch {
      enqueueSnackbar("Lỗi khi lưu lý do", { variant: "error" });
    }
  };

  const handlePrint = () => {
    if (!fromDate || !toDate) {
      enqueueSnackbar("Chọn đủ Từ ngày và Đến ngày để in", { variant: "warning" });
      return;
    }
    printStyledAttendance(filtered, dept === "all" ? "Tất cả" : dept, fromDate, toDate, includeSaturday);
  };

  if (!rows.length) return (
    <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <CircularProgress />
      <Typography sx={{ ml: 2 }}>Đang tải dữ liệu...</Typography>
    </Box>
  );

  const latestDate = rows.map(r => r.Ngày).sort().slice(-1)[0] || '-';

  return (
    <Box sx={{ px: 2, pb: 4 }}>


      <Grid container spacing={2} mb={3} justifyContent="center">
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#E3F2FD" }}>
            <Typography variant="subtitle2">Tổng số bản ghi</Typography>
            <Typography fontWeight="bold">{rows.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#FFFDE7" }}>
            <Typography variant="subtitle2">Đã lọc</Typography>
            <Typography fontWeight="bold">{filtered.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#F1F8E9" }}>
            <Typography variant="subtitle2">Số phòng ban</Typography>
            <Typography fontWeight="bold">{depts.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#FCE4EC" }}>
            <Typography variant="subtitle2">Ngày mới nhất</Typography>
            <Typography fontWeight="bold">{latestDate}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Bộ lọc
            </Typography>
            <DepartmentFilter depts={depts} value={dept} onChange={setDept} labels={{ all: "Tất cả" }} />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Từ ngày"
                value={fromDate}
                onChange={setFromDate}
                renderInput={(params) => <TextField margin="normal" fullWidth size="small" {...params} />}
              />
              <DatePicker
                label="Đến ngày"
                value={toDate}
                onChange={setToDate}
                renderInput={(params) => <TextField margin="normal" fullWidth size="small" {...params} />}
              />
            </LocalizationProvider>
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm theo tên, bộ phận, ngày..."
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
              onChange={(e) => {
                const k = e.target.value.trim().toLowerCase();
                if (!k) return setFiltered(rows);
                setFiltered(rows.filter(r => Object.values(r).some(v => v?.toString().toLowerCase().includes(k))));
              }}
            />
            {fromDate && toDate && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeSaturday}
                    onChange={(e) => setIncludeSaturday(e.target.checked)}
                  />
                }
                label="In thêm Thứ 7"
              />
            )}
            <Button
              fullWidth
              variant="contained"
              startIcon={<Print />}
              onClick={handlePrint}
              disabled={!fromDate || !toDate || (toDate < fromDate)}
            >
              In bảng chấm công
            </Button>
            {(!fromDate || !toDate) && (
              <Typography variant="caption" color="error" display="block" mt={1}>
                Chọn đủ Từ ngày và Đến ngày để in
              </Typography>
            )}
            {fromDate && toDate && toDate < fromDate && (
              <Typography variant="caption" color="error" display="block" mt={1}>
                Đến ngày phải lớn hơn hoặc bằng Từ ngày
              </Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Tooltip title="Chỉ chấp nhận .xlsx theo mẫu">
              <Typography fontWeight="bold" mb={1}>
                Tải file chấm công
              </Typography>
            </Tooltip>
            <FileUpload onFileUpload={handleFileUpload} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={9}>
          <AttendanceTable
            rows={filtered}
            includeSaturday={includeSaturday}
            onReasonSave={handleReasonSave}
            isMobile={false}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
