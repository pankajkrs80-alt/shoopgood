const params = new URLSearchParams(window.location.search);

const ref = params.get("ref");

if (ref) {

    localStorage.setItem("affiliateRef", ref);

    console.log("Affiliate:", ref);

}