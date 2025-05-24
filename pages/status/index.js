import useSWR from "swr";

async function FetchAPI(key) {
  const response = await fetch(key);
  const responseBody = await response.json();
  return responseBody;
}

export default function StatusPage() {
  return (
    <>
      <h1>Status</h1>
      <UpdatedAt />
      <h2>Dependências do sistema:</h2>
      <DatabaseStatus />
    </>
  );
}

function UpdatedAt() {
  const { isLoading, data } = useSWR("/api/v1/status", FetchAPI, {
    refreshInterval: 2000,
  });

  let updatedAtText = "Carregando...";

  if (!isLoading && data) {
    updatedAtText = new Date(data.updated_at).toLocaleString("pt-BR");
  }

  return (
    <>
      <div>Última atualização: {updatedAtText}</div>
    </>
  );
}

function DatabaseStatus() {
  const { isLoading, data } = useSWR("/api/v1/status", FetchAPI, {
    refreshInterval: 2000,
  });

  let dbVersion = "Carregando...";
  let dbMaxConnections = "Carregando...";
  let dbOpenedConnections = "Carregando...";

  if (!isLoading && data) {
    const dbData = data.dependencies.database;
    dbVersion = dbData.version;
    dbMaxConnections = dbData.max_connections;
    dbOpenedConnections = dbData.opened_connections;
  }

  return (
    <>
      <h3>Banco de dados:</h3>
      <div>Versão: {dbVersion}</div>
      <div>Máximo de conexões aceitas: {dbMaxConnections}</div>
      <div>Nº de conexões abertas: {dbOpenedConnections}</div>
    </>
  );
}
