@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

body{
font-family: 'Space Mono', monospace;
background:#ffffff;
color:#333;
scroll-behavior:smooth;
}

:root{
--primary:#333333;
--accent:#d4a843;
}

.navbar{
background:#333;
}

.navbar-brand,
.nav-link{
color:#fff !important;
}

.nav-link:hover{
color:var(--accent)!important;
}

.hero{
background:url('https://picsum.photos/1920/900?grayscale') center/cover;
height:80vh;
display:flex;
align-items:center;
color:white;
}

.hero-overlay{
background:rgba(0,0,0,0.6);
width:100%;
height:100%;
display:flex;
align-items:center;
}

.btn-gold{
background:var(--accent);
color:white;
border:none;
}

.btn-gold:hover{
background:#b68f36;
}

.card{
border:none;
transition:0.3s;
}

.card:hover{
transform:translateY(-5px);
box-shadow:0 10px 30px rgba(0,0,0,0.2);
}

.section{
padding:60px 0;
}

footer{
background:#222;
color:white;
padding:40px 0;
}

footer a{
color:#d4a843;
text-decoration:none;
}

.social-icons i{
font-size:22px;
margin-right:15px;
}

.fade-in{
opacity:0;
transform:translateY(20px);
transition:all 0.6s ease-in-out;
}

.fade-in.visible{
opacity:1;
transform:translateY(0);
}

.dark-mode{
background:#121212;
color:#eee;
}

.dark-mode .card{
background:#1e1e1e;
color:white;
}