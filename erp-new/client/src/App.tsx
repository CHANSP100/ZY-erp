import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Layout, Menu, Typography, Tag } from 'antd';
import IndxPage from './pages/IndxPage';
import PrdtPage from './pages/PrdtPage';
import CustPage from './pages/CustPage';
import SalesOrderPage from './pages/SalesOrderPage';
import SalesShipmentPage from './pages/SalesShipmentPage';
import SalesReturnPage from './pages/SalesReturnPage';
import SalmPage from './pages/SalmPage';
import DeptPage from './pages/DeptPage';
import WhPage from './pages/WhPage';
import { api } from './api';
import './App.css';

const { Header, Content } = Layout;

function AppShell() {
  const [stats, setStats] = useState({
    indxCount: 0,
    prdtCount: 0,
    custCount: 0,
    soCount: 0,
    saCount: 0,
    sbCount: 0,
    salmCount: 0,
    deptCount: 0,
    whCount: 0,
  });

  useEffect(() => {
    api.health().then((r) =>
      setStats({
        indxCount: r.data.indxCount,
        prdtCount: r.data.prdtCount,
        custCount: r.data.custCount ?? 0,
        soCount: r.data.soCount ?? 0,
        saCount: r.data.saCount ?? 0,
        sbCount: r.data.sbCount ?? 0,
        salmCount: r.data.salmCount ?? 0,
        deptCount: r.data.deptCount ?? 0,
        whCount: r.data.whCount ?? 0,
      })
    );
  }, []);

  const path = window.location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#001529', paddingInline: 16 }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>
          新 ERP 原型
        </Typography.Title>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[path]}
          items={[
            { key: '/indx', label: <Link to="/indx">中类</Link> },
            { key: '/prdt', label: <Link to="/prdt">货品</Link> },
            { key: '/cust', label: <Link to="/cust">客户厂商</Link> },
            { key: '/so', label: <Link to="/so">受订单</Link> },
            { key: '/sa', label: <Link to="/sa">销货单</Link> },
            { key: '/sb', label: <Link to="/sb">销货退回</Link> },
            { key: '/salm', label: <Link to="/salm">员工</Link> },
            { key: '/dept', label: <Link to="/dept">部门</Link> },
            { key: '/wh', label: <Link to="/wh">仓库</Link> },
          ]}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Tag color="blue">中类 {stats.indxCount}</Tag>
        <Tag color="green">货品 {stats.prdtCount}</Tag>
        <Tag color="gold">客户 {stats.custCount}</Tag>
        <Tag color="purple">受订 {stats.soCount}</Tag>
        <Tag color="magenta">销货 {stats.saCount}</Tag>
        <Tag color="volcano">销退 {stats.sbCount}</Tag>
        <Tag color="lime">员工 {stats.salmCount}</Tag>
        <Tag color="cyan">部门 {stats.deptCount}</Tag>
        <Tag color="geekblue">仓库 {stats.whCount}</Tag>
      </Header>
      <Content>
        <Routes>
          <Route path="/" element={<IndxPage />} />
          <Route path="/indx" element={<IndxPage />} />
          <Route path="/prdt" element={<PrdtPage />} />
          <Route path="/cust" element={<CustPage />} />
          <Route path="/so" element={<SalesOrderPage />} />
          <Route path="/sa" element={<SalesShipmentPage />} />
          <Route path="/sb" element={<SalesReturnPage />} />
          <Route path="/salm" element={<SalmPage />} />
          <Route path="/dept" element={<DeptPage />} />
          <Route path="/wh" element={<WhPage />} />
        </Routes>
      </Content>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
