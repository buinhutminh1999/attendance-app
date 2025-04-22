// src/pages/Home.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  TextField,
  CircularProgress,
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

// format Firestore Timestamp hoặc JS-Date → "dd/MM/yyyy"
const toDateString = (val) => {
  if (typeof val === "string") return val;
  const d = val.toDate ? val.toDate() : val;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// parse "dd/MM/yyyy" → JS-Date (giờ 0h)
const parseDMY = (s) => {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
};

export default function Home() {
  const [rows, setRows] = useState([]);       // toàn bộ dữ liệu
  const [filtered, setFiltered] = useState([]); // dữ liệu hiển thị bảng
  const [depts, setDepts] = useState([]);     // danh sách bộ phận
  const [dept, setDept] = useState("all");    // bộ phận đang chọn

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const { enqueueSnackbar } = useSnackbar();

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
      } catch {
        enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
      }
    })();
  }, [enqueueSnackbar]);

  // 2) Lọc khi rows / dept / fromDate / toDate thay đổi
  useEffect(() => {
    let tmp = rows;

    // lọc theo phòng ban
    if (dept !== "all") {
      tmp = tmp.filter((r) => r["Tên bộ phận"] === dept);
    }
    // lọc theo khoảng ngày
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      tmp = tmp.filter((r) => {
        const d = parseDMY(r.Ngày);
        return d >= start && d <= end;
      });
    }

    setFiltered(tmp);
  }, [rows, dept, fromDate, toDate]);

  // 3) Upload & lưu Firestore
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
          const others = prev.filter(
            (r) => !formatted.some((f) => f.id === r.id)
          );
          return [...others, ...formatted];
        });
      } catch {
        enqueueSnackbar("Lỗi khi tải file", { variant: "error" });
      }
    },
    [enqueueSnackbar]
  );

  // 4) In bảng đang hiển thị
  const handlePrint = () => {
    if (!fromDate || !toDate) {
      enqueueSnackbar("Chọn đủ Từ ngày và Đến ngày để in", {
        variant: "warning",
      });
      return;
    }
    printStyledAttendance(filtered, dept === "all" ? "Tất cả" : dept, fromDate, toDate);
  };

  // nếu chưa load xong data
  if (!rows.length) {
    return <CircularProgress sx={{ display: "block", mx: "auto", my: 4 }} />;
  }

  return (
    <>
      <Box mb={2}>
        <FileUpload onFileUpload={handleFileUpload} />
      </Box>

      <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
        <DepartmentFilter
          depts={depts}
          value={dept}
          onChange={setDept}
          labels={{ all: "Tất cả" }}
        />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Từ ngày"
            value={fromDate}
            onChange={(d) => setFromDate(d)}
            renderInput={(params) => (
              <TextField size="small" {...params} />
            )}
          />
          <DatePicker
            label="Đến ngày"
            value={toDate}
            onChange={(d) => setToDate(d)}
            renderInput={(params) => (
              <TextField size="small" {...params} />
            )}
          />
        </LocalizationProvider>
      </Box>

      <Box mb={2}>
        <FilterToolbar
          onSearchChange={(kw) => {
            const k = kw.toLowerCase();
            if (!k) return setFiltered(rows);
            setFiltered(
              rows.filter((r) =>
                Object.values(r).some(
                  (v) =>
                    v &&
                    v.toString().toLowerCase().includes(k)
                )
              )
            );
          }}
        />
      </Box>

      <Box mb={2}>
        <Button variant="contained" onClick={handlePrint}>
          IN BẢNG CHẤM CÔNG
        </Button>
      </Box>

      <AttendanceTable rows={filtered} onReasonSave={() => {}} />
    </>
  );
}
