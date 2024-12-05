document.getElementById("customerReport").addEventListener("blur", async () => {
    const customerReport = document.getElementById("customerReport").value;
  
    if (customerReport.trim() !== "") {
      const response = await fetch("/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customerReport }),
      });
  
      const result = await response.json();
      if (result.title && result.technicalDescription && result.priority) {
        document.getElementById("title").value = result.title;
        document.getElementById("technicalDescription").value = result.technicalDescription;
        document.getElementById("priority").value = result.priority;
      } else {
        alert("Erro ao gerar sugestões automáticas.");
      }
    }
  });
  
  document.getElementById("ticketForm").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const ticketData = {
      title: document.getElementById("title").value,
      customerReport: document.getElementById("customerReport").value,
      priority: document.getElementById("priority").value,
      requesterName: document.getElementById("requesterName").value,
      contactPhone: document.getElementById("contactPhone").value,
      technicalDescription: document.getElementById("technicalDescription").value,
    };
  
    const response = await fetch("/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ticketData),
    });
  
    const result = await response.json();
    if (result.success) {
      alert("Chamado criado com sucesso!");
      fetchTickets();
    } else {
      alert("Erro ao criar chamado.");
    }
  });
  
  async function fetchTickets() {
    const response = await fetch("/tickets");
    const tickets = await response.json();
    const logsContainer = document.getElementById("ticketLogs");
  
    logsContainer.innerHTML = "";
    tickets.forEach((ticket) => {
      const listItem = document.createElement("li");
      listItem.textContent = `Título: ${ticket.title} | Prioridade: ${ticket.priority}`;
      logsContainer.appendChild(listItem);
    });
  }
  
  fetchTickets();
  