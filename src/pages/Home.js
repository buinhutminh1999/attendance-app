// src/pages/Home.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Stack,
  Grid,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import FileUpload from "../components/FileUpload";
import DepartmentFilter from "../components/DepartmentFilter";
import FilterToolbar from "../components/FilterToolbar";
import AttendanceTable from "../components/AttendanceTable";

import {
  convertExcelDateToJSDate,
  convertExcelTimeToTimeString,
} from "../utils/dateUtils";
import { printStyledAttendance } from "../utils/printUtils";

import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useSnackbar } from "notistack";

// helper: Firestore Timestamp | Date → "dd/MM/yyyy"
const toDateString = (val) => {
  if (typeof val === "string") return val;
  const d = val.toDate ? val.toDate() : val;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// parse "dd/MM/yyyy" → Date
const parseDMY = (s) => {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
};

export default function Home() {
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [depts, setDepts] = useState([]);
  const [dept, setDept] = useState("all");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1) Load attendance + lý do
  useEffect(() => {
    (async () => {
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
            S1: data.S1 || "",
            S2: data.S2 || "",
            C1: data.C1 || "",
            C2: data.C2 || "",
            morning: lateMap[d.id]?.morning || "",
            afternoon: lateMap[d.id]?.afternoon || "",
          };
        });
        setRows(all);
        setDepts(Array.from(new Set(all.map((r) => r["Tên bộ phận"]))));
      } catch (err) {
        console.error(err);
        enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [enqueueSnackbar]);

  // 2) Compute filtered via useMemo
  const filtered = useMemo(() => {
    return rows
      .filter((r) => (dept === "all" ? true : r["Tên bộ phận"] === dept))
      .filter((r) => {
        if (!fromDate || !toDate) return true;
        const d = parseDMY(r.Ngày);
        d.setHours(12, 0, 0); // normalize midday
        return d >= fromDate && d <= toDate;
      });
  }, [rows, dept, fromDate, toDate]);

  // 3) Upload & save Firestore
  const handleFileUpload = useCallback(
    async (rawRows) => {
      try {
        const formatted = rawRows.map((r) => {
          const dateStr = convertExcelDateToJSDate(r["Ngày"]);
          return {
            id: `${r["Tên nhân viên"]}_${dateStr.replace(/\//g, "-")}`,
            "Tên nhân viên": r["Tên nhân viên"],
            "Tên bộ phận": r["Tên bộ phận"],
            Ngày: dateStr,
            S1: convertExcelTimeToTimeString(r.S1),
            S2: convertExcelTimeToTimeString(r.S2),
            C1: convertExcelTimeToTimeString(r.C1),
            C2: convertExcelTimeToTimeString(r.C2),
            morning: "",
            afternoon: "",
          };
        });
        await Promise.all(
          formatted.map((row) =>
            setDoc(doc(db, "attendance", row.id), row, { merge: true })
          )
        );
        enqueueSnackbar("Tải & lưu cloud thành công", {
          variant: "success",
        });
        setRows((prev) => {
          // merge old + new, replace by id
          const map = Object.fromEntries(prev.map((r) => [r.id, r]));
          formatted.forEach((f) => (map[f.id] = f));
          return Object.values(map);
        });
      } catch (err) {
        console.error(err);
        enqueueSnackbar("Lỗi khi tải file", { variant: "error" });
      }
    },
    [enqueueSnackbar]
  );

  // 4) Print
  const handlePrint = () => {
    if (!fromDate || !toDate) {
      enqueueSnackbar("Chọn đủ Từ ngày và Đến ngày để in", {
        variant: "warning",
      });
      return;
    }
    if (!filtered.length) {
      enqueueSnackbar("Không có dữ liệu để in", { variant: "warning" });
      return;
    }
    printStyledAttendance(
      filtered,
      dept === "all" ? "Tất cả" : dept,
      fromDate,
      toDate
    );
  };

  // 5) Clear filters
  const handleClear = () => {
    setDept("all");
    setFromDate(null);
    setToDate(null);
  };

  if (loading) {
    return <CircularProgress sx={{ display: "block", mx: "auto", my: 4 }} />;
  }

  return (
    <Stack spacing={2}>
      <FileUpload onFileUpload={handleFileUpload} />

      <Grid container spacing={2}>
        <Grid item xs={12} sm="auto">
          <DepartmentFilter
            depts={depts}
            value={dept}
            onChange={setDept}
            labels={{ all: "Tất cả" }}
          />
        </Grid>
        <Grid item xs={12} sm="auto">
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack direction="row" spacing={1}>
              <DatePicker
                label="Từ ngày"
                value={fromDate}
                onChange={setFromDate}
                renderInput={(params) => <TextField size="small" {...params} />}
              />
              <DatePicker
                label="Đến ngày"
                value={toDate}
                onChange={setToDate}
                renderInput={(params) => <TextField size="small" {...params} />}
              />
            </Stack>
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm="auto">
          <Button variant="outlined" onClick={handleClear}>
            Xóa bộ lọc
          </Button>
        </Grid>
      </Grid>

      <FilterToolbar
        onSearchChange={(kw) => {
          // thư riêng hoặc có thể gộp vào useMemo
          const k = kw.toLowerCase();
          if (!k) return;
          // filter in place
          // (mình đang dùng useMemo, nên bạn có thể đưa tìm kiếm vào đó nếu muốn)
        }}
      />

      <Button
        variant="contained"
        onClick={handlePrint}
        disabled={!fromDate || !toDate || !filtered.length}
      >
        IN BẢNG CHẤM CÔNG
      </Button>

      <AttendanceTable rows={filtered} onReasonSave={() => {}} />
    </Stack>
  );
}
